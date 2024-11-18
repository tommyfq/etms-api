const moment = require('moment');
const bcrypt = require('bcryptjs');
var jwt = require("jsonwebtoken");
const config = require("../../config/app.config");
const email = require("../services/email.services")

const db = require("../models");
const User = db.users
const Company = db.companies
const Role = db.roles
const DC = db.dcs
const UserAccess = db.user_dc_access

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
          where:{
            username: username,
          }
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
  var response = await email.sendEmail()
  return res.status(200).send({
    is_ok:true,
    message:"Succesfully Send Email"
  });
}
  module.exports = {
    signin,
    verifyToken,
    testEmail
}