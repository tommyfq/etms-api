const bcrypt = require('bcryptjs');
const db = require("../models");
const Companies = db.companies;
const Users = db.users;
const Roles = db.roles;
const Op = db.Sequelize.Op;
const { sequelize, Sequelize } = require("../models");

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
  
    var page = req.body.page;
    var page_length = 20; //default 20
    var column_sort = "username";
    var order = "asc"
  
    if(req.body.hasOwnProperty("column_sort")){
      column_sort = req.body.column_sort
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
  
    if(req.body.hasOwnProperty("search_company_name")){
      where_query = {
        ...where_query,
        company_name: {
          [Op.iLike]: '%'+req.body.search_company_name+'%'
        }
      }
    }
  
  
    if(req.body.hasOwnProperty("search_role_id")){
      where_query = {
        ...where_query,
          role_id: req.body.search_role_id
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
        if(result.count == 0){
            res.status(200).send({
                message:"No Data Found in Dealer",
                data:result.rows,
                total:result.count
            })
        }else{
            res.status(200).send({
                message:"Success",
                data:result.rows,
                total:result.count
            })
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
        res.status(200).send({
            message:"Success",
            data:result
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
        username:req.body.dc_name,
        name:req.body.name,
        is_active:req.body.is_active,
        email:req.body.address,
        role_id:req.body.role_id
      }
      
      const dc = await Users.update(data,{
        where:{
          id:req.body.id
        },
        transaction: t});
      
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