const bcrypt = require('bcryptjs');
const db = require("../models");
const Companies = db.companies;
const Users = db.users;
const UserDCAccess = db.user_dc_access;
const DC = db.dcs
const Roles = db.roles;
const Op = db.Sequelize.Op;
const {fn,where,col} = db.Sequelize
const { sequelize, Sequelize } = require("../models");
const { createPagination, createPaginationNoData } = require("../helpers/pagination");
const {verifyEmail} = require('../services/email.services')

async function hashPassword(plainPassword) {
    const saltRounds = 10; // You can increase the number of salt rounds for more security
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
    return hashedPassword;
  }
  
const getListAgent = (req,res) => {

  var where_query = {role_id:2};
  var param_order = ['name', "asc"];

  Users.findAll({
      attributes:[
        'id',
        'name',
      ],
      where: where_query,
      order: [param_order],
      raw:true
  })
  .then(result => {
      if(result.count == 0){
          res.status(200).send({
              message:"No Data Found in Dealer",
              data:result
          })
      }else{
          res.status(200).send({
              message:"Success",
              data:result
          })
      }
  });
};

const getListRole = (req,res) => {

    var where_query = {is_active:true};
    var param_order = ['role_name', "asc"];
  
    Roles.findAll({
        attributes:[
          ['id','role_id'],
          'role_name',
        ],
        where: where_query,
        order: [param_order],
        raw:true
    })
    .then(result => {
        if(result.count == 0){
            res.status(200).send({
                message:"No Data Found in Dealer",
                data:result
            })
        }else{
            res.status(200).send({
                message:"Success",
                data:result
            })
        }
    });
  };

  const list = (req,res) => {
    /* search by company name */
    /* search by agent name */
  
    /* 
      search_company_name
      search_agent_name
      page
      page_length
      column_sort
      order
    */
  
      let page = parseInt(req.body.page, 10);
      var page_length = req.body.items_per_page; //default 20
      var column_sort = "id"
      var order = "desc"
  
    if(req.body.hasOwnProperty("sort")){
      column_sort = req.body.sort
    }
  
    if(req.body.hasOwnProperty("order")){
      order = req.body.order
    }
  
    var where_query = {};
    
    var param_order = [];
  
    console.log(column_sort);
    
    if(column_sort == 'role'){
      param_order = ['role','role_name', order];
    }else{
      param_order = [column_sort,order];
    }
  
    if(req.body.hasOwnProperty("filter_is_active")){
      where_query = {
        ...where_query,
        is_active: req.body.filter_is_active
      }
    }
  
  
    if(req.body.hasOwnProperty("filter_role")){
      where_query = {
        ...where_query,
          role_id: req.body.filter_role
      }
    }

    if(req.body.hasOwnProperty("search")){
      if(req.body.search != ""){
          where_query = {
              ...where_query,
              [Op.or]: [
                {
                    name: {
                        [Op.iLike]: `%${req.body.search}%`
                    }
                },
                {
                  email: {
                      [Op.iLike]: `%${req.body.search}%`
                  }
                },
                {
                    username: {
                        [Op.iLike]: `%${req.body.search}%`
                    }
                }
            ]
          }
      }
    }
  
    Users.findAndCountAll({
        include: [
          { 
            model: Roles, 
            as : 'role',
            attributes: []
          },
        ],
        attributes:[
          'id',
          'username',
          'name',
          'email',
          'is_active',
          'createdAt',
          'updatedAt',
          'role_id',
          [Sequelize.col('role.role_name'), 'role_name']
        ],
        where: where_query,
        offset: (page-1)*page_length,
        limit: page_length,
        order: [param_order],
        raw:true
    })
    .then(result => {
      const total_count = result.count; // Total number of items
      const total_pages = Math.ceil(total_count / page_length)
  
      if (result.count === 0) {
  
        res.status(200).send({
          message: "No Data Found in User",
          data: result.rows,
          payload: createPaginationNoData(page, total_pages, page_length, 0)
        });
      } else {
        
        res.status(200).send({
          message: "Success",
          data: result.rows,
          payload: {
            pagination: createPagination(page, total_pages, page_length, result.count)
          }
        });
      }
    });
  };
  
  const detail = (req,res) => {
    var id = req.params.id;
    
    Users.findOne({
        include: [
            { 
              model: Roles, 
              as : 'role',
              attributes: []
            },
            {
              model: UserDCAccess,
              as: 'access',
              attributes:['dc_id','company_id']
            }
          ],
          attributes:[
            'id',
            'username',
            'name',
            'email',
            'is_active',
            'createdAt',
            'updatedAt',
            'role_id',
            [Sequelize.col('role.role_name'), 'role_name']
          ],
        where:{id:id}
    }).then(result=>{

        const dcsArray = result.access.map(dc => dc.dc_id);

        let formattedResult = {
            ...result.get(), // Convert Sequelize model instance to a plain object
            dcs: dcsArray // Assign the array of dc_id numbers
        };

        if(result.access.length > 0){
          formattedResult["company_id"] = result.access[0].company_id
        }
        
        res.status(200).send({
            message:"Success",
            data:formattedResult
        });
    })
  }
  
  async function update (req,res) {

    const existEmail = await Users.findOne({
        where:{
            email: req.body.email,
            id: { [Op.ne]: req.body.id }
        }
    });

    if(existEmail){
        return res.status(200).send({
            is_ok:false,
            message:"Email is already exist"
        });
    }
    

    const existUsername = await Users.findOne({
      where:{
        [Op.and]:[
          where(fn('LOWER', col('username')), fn('LOWER', req.body.username)),
          {id: { [Op.ne]: req.body.id }}
        ]
      }
  });

    if(existUsername){
        return res.status(200).send({
            is_ok:false,
            message:"Username is already exist"
        });
    }

    //const t = await sequelize.transaction();
    const t = await sequelize.transaction();
    try{
      var data = {
        username:req.body.username,
        name:req.body.name,
        is_active:req.body.is_active,
        email:req.body.email,
        role_id:req.body.role_id
      }
      
      const user = await Users.update(data,{
        where:{
          id:req.body.id
        },
        transaction: t});
      
      const result = await UserDCAccess.destroy({
        where: {
          user_id: req.body.id
        },
        transaction:t
      });

      console.log(req.body.dcs)
      var dcAccess = []
        for(let dc of req.body.dcs){
          console.log(dc)
          existDC = await DC.findOne({
            where:{
              id:dc,
              is_active:true
            },
            transaction:t
          });

          if(!existDC){
            await t.rollback(); 
            return res.status(200).send({
              is_ok:false,
              message:"DC is not found"
            });
          }

          dcAccess.push({
            user_id:req.body.id,
            company_id:req.body.company_id,
            dc_id:existDC.id
          });
        }

        if(req.body.role_id == 4){

          dcAccess.push({
            user_id:req.body.id,
            company_id:req.body.company_id,
            dc_id:null
          });
        }

        console.log(dcAccess);
        console.log(dcAccess.length);
        if(dcAccess.length > 0){
          await UserDCAccess.bulkCreate(dcAccess, {
            validate: true,
            ignoreDuplicates: true,
            individualHooks: true,
            transaction: t
          });
        }

      await t.commit();
      return res.status(200).send({
          is_ok:true,
          message:"Successfully saved"
      });

    }catch(error){
        await t.rollback();
        return res.status(200).send({
            is_ok:false,
            message:error.toString()
        });
    } 
  }
  
  async function create (req,res){
    const existEmail = await Users.findOne({
        where:{
            email: req.body.email
        }
    });

    if(existEmail){
        return res.status(200).send({
            is_ok:false,
            message:"Email is already exist"
        });
    }
    
    const existUsername = await Users.findOne({
        where:where(
          fn('LOWER', col('username')), // Convert database column to lowercase
          fn('LOWER', req.body.username) // Convert input to lowercase
        )
    });

    if(existUsername){
        return res.status(200).send({
            is_ok:false,
            message:"Username is already exist"
        });
    }

    const t = await sequelize.transaction();
    try{
      //await verifyEmail(req.body.email)

        var hashedPassword = await hashPassword(req.body.password)
        console.log(hashedPassword)
        var data = {
            username:req.body.username,
            name:req.body.name,
            is_active:req.body.is_active,
            email:req.body.email,
            role_id:req.body.role_id,
            password:hashedPassword
        }
      
        const user = await Users.create(data,{transaction: t});
        
        var dcAccess = []
        for(let dc of req.body.dcs){
          existDC = await DC.findOne({
            where:{
              id:dc,
              is_active:true
            },
            transaction:t
          });

          if(!existDC){
            await t.rollback(); 
            return res.status(200).send({
              is_ok:false,
              message:"DC is not found"
            });
          }

          dcAccess.push({
            user_id:user.id,
            company_id:existDC.company_id,
            dc_id:existDC.id
          });
        }

        const existRole = await Roles.findOne({
          where:{
              id: req.body.role_id
          }
        });

        if(!existRole){
          await t.rollback(); 
          return res.status(200).send({
            is_ok:false,
            message:"Role is not found"
          });
        }

        if(existRole.role_name == "super_client"){
          dcAccess.push({
            user_id:user.id,
            company_id:req.body.company_id,
          })
        }

        if(dcAccess.length > 0){
          await UserDCAccess.bulkCreate(dcAccess, {
            validate: true,
            ignoreDuplicates: true,
            individualHooks: true,
            transaction: t
          });
        }
        
        await t.commit();
        return res.status(200).send({
            is_ok:true,
            message:"Successfully saved"
        });

    }catch(error){
        await t.rollback();
        return res.status(200).send({
            is_ok:false,
            message:error.toString()
        });
    } 
  }

  const accountDetail = (req,res) => {

    const host = req.get('host');
    const protocol = req.protocol;
    const baseUrl = `${protocol}://${host}`;

    const sqlQuery = `
        SELECT
            "u"."id", "u"."username", "u"."name", "u"."email", "u"."is_active",
            "u"."createdAt", "u"."updatedAt", "u"."role_id", 
            CONCAT(:baseUrl, "u"."avatar") AS "avatar",
            "r"."role_name" as role,
            (
                SELECT "c".company_name FROM user_dc_accesses AS "a"
                INNER JOIN companies AS "c" ON "a"."company_id" = "c"."id"
                WHERE "a"."user_id" = "u"."id" LIMIT 1
            ) AS "company_name",
            (
                SELECT COALESCE(STRING_AGG("dc".dc_name, ', '), '')
                FROM user_dc_accesses AS "a"
                INNER JOIN dcs AS "dc" ON "a"."dc_id" = "dc"."id"
                WHERE "a"."user_id" = "u"."id"
            ) AS "dcs"
        FROM 
            users AS "u"
        LEFT JOIN 
            roles AS "r" ON "u"."role_id" = "r"."id"
        WHERE 
            "u"."id" = :id;
    `;

    sequelize.query(sqlQuery, {
        replacements: { 
          id: req.user_id,
          baseUrl: baseUrl 
        },
        type: sequelize.QueryTypes.SELECT
    })
    .then(results => {
        if (!results || results.length === 0) {
            return res.status(200).send({ 
              is_ok:true,
              message: "User not found" 
            });
        }

        const formattedResult = results[0];
        
        // The 'dcs' field is now a single string, e.g., "DC-West, DC-East"
        // No JSON parsing is needed.
        
        res.status(200).send({
            is_ok:true,
            message: "Success",
            data: formattedResult
        });
    })
    .catch(err => {
        console.error("Error executing raw query:", err);
        res.status(200).send({ 
          is_ok:false,
          message: "An error occurred" 
        });
    });
  }

  const updateProfile = async (req, res) => {
    try {
      const userId = req.user_id; // Get user ID from JWT token
      
      // Validation
      if (!req.body.name || req.body.name.trim() === '') {
        return res.status(400).send({
          is_ok: false,
          message: "Name is required"
        });
      }

      if (!req.body.email || req.body.email.trim() === '') {
        return res.status(400).send({
          is_ok: false,
          message: "Email is required"
        });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(req.body.email)) {
        return res.status(400).send({
          is_ok: false,
          message: "Invalid email format"
        });
      }

      // Check if email already exists for other users
      const existEmail = await Users.findOne({
        where: {
          email: req.body.email,
          id: { [Op.ne]: userId }
        }
      });

      if (existEmail) {
        return res.status(400).send({
          is_ok: false,
          message: "Email is already exist"
        });
      }

      // Check if user exists
      const user = await Users.findByPk(userId);
      if (!user) {
        return res.status(404).send({
          is_ok: false,
          message: "User not found"
        });
      }

      // Prepare update data
      const updateData = {
        name: req.body.name.trim(),
        email: req.body.email.trim()
      };

      // Handle avatar upload if provided
      if (req.file) {
        // Delete old avatar file if exists
        if (user.avatar) {
          const fs = require('fs');
          const path = require('path');
          const oldAvatarPath = path.join(__dirname, `../../public/avatars/${req.user_id}/`, user.avatar);
          if (fs.existsSync(oldAvatarPath)) {
            fs.unlinkSync(oldAvatarPath);
          }
        }
        updateData.avatar = `/avatars/${req.user_id}/${req.file.filename}`
      }

      console.log("===UPDATED_DATA===")
      console.log(updateData)
      // Update user profile
      await Users.update(updateData, {
        where: { id: userId }
      });

      const host = req.get('host');
      const protocol = req.protocol;
      const baseUrl = `${protocol}://${host}`;

      const sqlQuery = `
          SELECT
              "u"."id", "u"."username", "u"."name", "u"."email", "u"."is_active",
              "u"."createdAt", "u"."updatedAt", "u"."role_id", 
              CONCAT(:baseUrl, "u"."avatar") AS "avatar",
              "r"."role_name" as role,
              (
                  SELECT "c".company_name FROM user_dc_accesses AS "a"
                  INNER JOIN companies AS "c" ON "a"."company_id" = "c"."id"
                  WHERE "a"."user_id" = "u"."id" LIMIT 1
              ) AS "company_name",
              (
                  SELECT COALESCE(STRING_AGG("dc".dc_name, ', '), '')
                  FROM user_dc_accesses AS "a"
                  INNER JOIN dcs AS "dc" ON "a"."dc_id" = "dc"."id"
                  WHERE "a"."user_id" = "u"."id"
              ) AS "dcs"
          FROM 
              users AS "u"
          LEFT JOIN 
              roles AS "r" ON "u"."role_id" = "r"."id"
          WHERE 
              "u"."id" = :id;
      `;

      const updatedUser = await sequelize.query(sqlQuery, {
          replacements: { 
            id: req.user_id,
            baseUrl: baseUrl 
          },
          type: sequelize.QueryTypes.SELECT
      })

      return res.status(200).send({
        is_ok: true,
        message: "Profile updated successfully",
        data: updatedUser[0]
      });

    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).send({
        is_ok: false,
        message: "Internal server error"
      });
    }
  };

  const changePassword = async (req, res) => {
    try {
      const userId = req.user_id;

      // Check if user exists
      const user = await Users.findByPk(userId);
      if (!user) {
        return res.status(404).send({
          is_ok: false,
          message: "User not found"
        });
      }

      // Check old password
      const isOldPasswordValid = await bcrypt.compare(req.body.oldPassword, user.password);
      console.log("isOldPasswordValid")
      console.log(isOldPasswordValid)
      if (!isOldPasswordValid) {
        return res.status(200).send({
          is_ok: false,
          message: "Old password is incorrect"
        });
      }

      // Check if new password matches confirm password
      if (req.body.newPassword !== req.body.confirmPassword) {
        return res.status(200).send({
          is_ok: false,
          message: "New password and confirm password do not match"
        });
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(req.body.newPassword);

      // Check old password
      const isNewPasswordValid = await bcrypt.compare(req.body.newPassword, user.password);
      console.log("isNewPasswordValid")
      console.log(isNewPasswordValid)
      if (isNewPasswordValid) {
        return res.status(200).send({
          is_ok: false,
          message: "Cannot used old password"
        });
      }

      // Update password
      await Users.update(
        { password: hashedNewPassword },
        { where: { id: userId } }
      );

      return res.status(200).send({
        is_ok: true,
        message: "Password changed successfully"
      });

    } catch (error) {
      console.error('Change password error:', error);
      return res.status(200).send({
        is_ok: false,
        message: "Internal server error"
      });
    }
  };

module.exports = {
    getListAgent,
    getListRole,
    list,
    detail,
    create,
    update,
    accountDetail,
    updateProfile,
    changePassword
}