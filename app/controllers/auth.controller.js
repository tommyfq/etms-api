const moment = require('moment');
const bcrypt = require('bcryptjs');
var jwt = require("jsonwebtoken");
const config = require("../../config/app.config");
const {sendEmail} = require('../services/email.services')
const { validateHeaders, hashPassword } = require('../helpers/general')

const db = require("../models");
const {fn,where,col} = db.Sequelize
const User = db.users
const Company = db.companies
const Role = db.roles
const DC = db.dcs
const UserAccess = db.user_dc_access
const LogReset = db.log_reset
const { sequelize, Sequelize } = require("../models");

async function signin(req, res) {
  
    try {
      const username = req.body.username;
      const password = req.body.password;

      if(username == ""){
        return res.status(200).send(
            {
              is_ok: false,
              message: "Username is empty"
            }
          );
      }

      if(password == ""){
        return res.status(200).send(
            {
              is_ok: false,
              message: "Password is empty"
            }
          );
      }
  
      const user = await User.findOne(
        {
          include:[
            {
              model:UserAccess,
              as:"access",
              include:[
                {
                    model:Company
                },
                {
                    model:DC
                }
              ]
            },
            {
              model:Role,
              as:'role'
            }
          ],
          where:where(fn('LOWER', col('username')), fn('LOWER', req.body.username)),
        }
      );
  
      if(user == null){
        return res.status(200).send(
          {
            is_ok: false,
            message: "User Not found."
          }
        );
      }
  
      if(!user.is_active){
        return res.status(200).send(
          {
            is_ok: false,
            message: "User is not active"
          }
        );
      }
  
      var passwordIsValid = bcrypt.compareSync(
        password,
        user.password
      );
      if(!passwordIsValid){
        return res.status(200).send({
          is_ok: false,
          message: "Invalid Password!"
        });
      }
  
      var data = {
        id: user.id,
        username: user.username,
        email: user.email,
        role_id: user.role.id,
        role_name: user.role.role_name,
        company_id: 0,
        dcs:[]
      }

      if (user.access && user.access.length > 0) {
        // Access the first item and its company_id
        const firstCompanyId = user.access[0].company_id;
        
        data.company_id = firstCompanyId

        if(user.role.role_name == "super_client"){
          var dcs = await DC.findAll({
            where:{
              company_id:user.access[0].company_id
            }
          });
          console.log(dcs);
          data.dcs = dcs.map((a)=>(a.id))
        }else{
          data.dcs = user.access.map((a)=>(a.dc_id))
        }
      }
  
      //Checks user isHO
  
      var token = jwt.sign(
        data, 
        config.secret, 
        {
          expiresIn: config.expired_time // 24 hours
        }
      );
  
    //   var today = moment().format('YYYY-MM-DD HH:mm:ss');
    //   await User.update({
    //     'last_login': today
    //   },{
    //     where:{id:user.id}
    //   });
  
      return res.status(200).send({
        is_ok:true,
        message:"Succesfully Login",
        data:{token:token,user:data}
      });
    } catch (error) {
      console.log(error)
      return res.json({
        is_ok: false,
        message: error.toString()
      })
    }
  
  }

async function verifyToken(req, res){
    const { token } = req.body; // Get the token from the request body

    // return res.status(200).send(
    //     {
    //       is_ok: false,
    //       message: "Username is empty"
    //     }
    //   );

    if (!token) {
        return res.status(400).json({ message: 'Token is required', error: 'Token is required'});
    }

    try {
        // Verify the token using the secret key
        const decoded = jwt.verify(token, config.secret);
        // Assuming the token contains the user id, find the user
        const user = await User.findOne(
            {
              include:[
                {
                  model:UserAccess,
                  as:"access",
                  include:[
                    {
                        model:Company
                    },
                    {
                        model:DC
                    }
                  ]
                },
                {
                  model:Role,
                  as:'role'
                }
              ],
              where:{
                id:decoded.id
            }
            }
          );

        if (user) {
            var data = {
                id: user.id,
                username: user.username,
                email: user.email,
                role_id: user.role.id,
                role_name: user.role.role_name,
                dcs: user.access?.map((a) => a.dc_id) ?? []
            }

            return res.json( data );
        } else {
            return res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.log(error)
        return res.status(401).json({ error: 'Invalid token' });
    }
}

async function testEmail(req, res){
  var response = await email.testMail()
  return res.status(200).send({
    is_ok:true,
    message:"Succesfully Send Email"
  });
}

async function forgotPassword(req, res) {
  const email = req.body.email;

  try {
    const user = await User.findOne({
      where: {
        email: email
      },
    });

    // For security, we send the same response whether the user is found or not.
    // This prevents attackers from checking which emails are registered (user enumeration).
    if (!user) {
      return res.status(200).send({
        is_ok: true,
        message: "If your email is in our system, you will receive a password reset link."
      });
    }

    // Check if a recent request already exists
    const logReset = await LogReset.findOne({
      where: {
        user_id: user.id
      }
    });

    if (logReset && moment().diff(moment(logReset.createdAt), 'hours') < 2) {
      return res.status(200).send({ // 429 Too Many Requests is more appropriate
        is_ok: false,
        message: "Password reset link already sent. Please wait 2 hours before trying again."
      });
    }

    // Generate a new JWT token for the password reset
    const token = jwt.sign({
      id: user.id
    }, config.secret, {
      expiresIn: config.expired_time // e.g., '2h'
    });

    const t = await sequelize.transaction();

    try {
      // If a log exists, update it. If not, create it.
      if (logReset) {
        await LogReset.update({
          token: token
        }, {
          where: {
            id: logReset.id
          },
          transaction: t
        });
      } else {
        await LogReset.create({
          token: token,
          user_id: user.id
        }, {
          transaction: t
        });
      }

      // --- FIX & REFACTOR: Email sending logic moved here ---
      // Prepare email data and send the email
      const templateData = {
        userName: user.username,
        resetLink: `${config.fe_url}/auth/reset-password?token=${token}`,
      };

      // Send a single email to the user who requested the reset
      await sendEmail(user.email, 'Epsindo - Reset Password', 'forgot_password.ejs', templateData);

      // If everything is successful, commit the transaction
      await t.commit();

      // --- FIX: Added a proper success response ---
      return res.status(200).send({
        is_ok: true,
        message: "If your email is in our system, you will receive a password reset link."
      });

    } catch (error) {
      // If any error occurs during DB operation or email sending, roll back
      await t.rollback();
      console.log(error);
      return res.status(500).json({ // 500 Internal Server Error is more appropriate
        is_ok: false,
        message: "An internal error occurred. Please try again later."
      });
    }

  } catch (error) {
    // Catch errors from the initial user lookup
    console.log(error);
    return res.status(500).json({
      is_ok: false,
      message: "An error occurred while processing your request."
    });
  }
}

async function resetPassword(req, res){
  const { password } = req.body; // Get the token from the request body

  let token = req.headers['authorization'];

  if (!token) {
    return res.status(403).send({
      message: "No token provided!"
    });
  }
  
  if (!token.startsWith("Bearer ")) {
    return res.status(403).send({
      message: "No token provided!"
    });
  }
  
  token = token.replace("Bearer ","");

  const logReset = await LogReset.findOne(
    {
      where:{token:token}
    }
  );

  if(logReset){
    const t = await sequelize.transaction();
    try {
      // Verify the token using the secret key
      const decoded = jwt.verify(token, config.secret);
      // Assuming the token contains the user id, find the user
      const user = await User.findOne(
        {
          where:{
            id:decoded.id
          }
        }
      );
  
      if (!user) {
        return res.status(403).send(
          {message: "User not found"}
        );
      } 
      let hashedPassword = await hashPassword(password);
      await User.update({password:hashedPassword},{
      where:{
        id:decoded.id
      },
      transaction: t});

      await LogReset.destroy({
        where: {
          id: logReset.id,
        },
        transaction:t
      });

      await t.commit();

      return res.status(200).send(
        {
          is_ok: true,
          message: "Password has been reset"
        }
      );
  
    } catch (error) {
      await t.rollback();
      if (error.name === 'TokenExpiredError') {
        // token is expired
        return res.status(403).send({
          message: "Link is expired"
        });
      }
        console.log(error)
        return res.status(200).send(
          {
            is_ok: false,
            message: "Internal server error"
          }
        );
      }
  }else{
    return res.status(403).send({
      message: "Token is not exist"
    });
  }
  
}

async function checkToken(req,res){
  let token = req.headers['authorization'];

  if (!token) {
    return res.status(200).send({
      is_ok: false,
      message: "No token provided!"
    });
  }
  
  if (!token.startsWith("Bearer ")) {
    return res.status(200).send({
      is_ok: false,
      message: "No token provided!"
    });
  }
  
  token = token.replace("Bearer ","");

  const logReset = await LogReset.findOne(
    {
      where:{token:token}
    }
  );

  if(logReset){
    try{
      const decoded = jwt.verify(token, config.secret);
      // Assuming the token contains the user id, find the user
      const user = await User.findOne(
        {
          where:{
            id:decoded.id
          }
        }
      );

      if (!user) {
        return res.status(200).send(
          {
            is_ok: false,
            message: "User not found"
          }
        );
      } 

      return res.status(200).send(
        {
          is_ok: true,
          message: "Token is Valid"
        }
      );
    
    }catch(error){
      if (error.name === 'TokenExpiredError') {
        // token is expired
        return res.status(200).send({
          is_ok:false,
          message: "Link is expired"
        });
      }

      console.log(error)
      return res.status(200).send(
        {
          is_ok: false,
          message: "Internal server error"
        }
      );
    }
  }
}

  module.exports = {
    signin,
    verifyToken,
    testEmail,
    resetPassword,
    forgotPassword,
    checkToken
}