const bcrypt = require('bcryptjs');
const db = require("../models");
const Companies = db.companies;
const Users = db.users;
const UserDCAccess = db.user_dc_access;
const DC = db.dcs
const Roles = db.roles;
const Op = db.Sequelize.Op;
const { sequelize, Sequelize } = require("../models");
const { createPagination, createPaginationNoData } = require("../helpers/pagination");

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
            username: req.body.username,
            id: { [Op.ne]: req.body.id }
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

        if(req.body.role_id = 4){

          dcAccess.push({
            user_id:req.body.id,
            company_id:req.body.company_id,
            dc_id:null
          });
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
        where:{
            username: req.body.username
        }
    });

    if(existUsername){
        return res.status(200).send({
            is_ok:false,
            message:"Username is already exist"
        });
    }

    const t = await sequelize.transaction();
    // try{
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

        if(req.role_name == "super_client"){
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

    // }catch(error){
    //     await t.rollback();
    //     return res.status(200).send({
    //         is_ok:false,
    //         message:error.toString()
    //     });
    // } 
  }

module.exports = {
    getListAgent,
    getListRole,
    list,
    detail,
    create,
    update
}