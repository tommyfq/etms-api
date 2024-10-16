const moment = require('moment')
const db = require("../models");
const Op = db.Sequelize.Op;
const { sequelize, Sequelize } = require("../models");
const Items = db.items;

const list = (req,res) => {
  console.log("===ASSET_LIST===")
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
  console.log(req.body);
  var page = req.body.page;
  var page_length = 20; //default 20
  var column_sort = "id";
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
  
  param_order = [column_sort,order];
  
  if(req.body.hasOwnProperty("search_brand")){
    if(req.body.search_brand != ""){
      where_query = {
        ...where_query,
        brand: {
          [Op.iLike]: '%'+req.body.search_brand+'%'
        }
      }
    }
  }

  if(req.body.hasOwnProperty("search_model")){
    if(req.body.search_model != ""){
      where_query = {
        ...where_query,
        model: {
          [Op.iLike]: '%'+req.body.search_model+'%'
        }
      }
    }
  }

  Items.findAndCountAll({
      attributes:[
        'id',
        'brand',
        'model',
        'createdAt',
        'updatedAt',
        'is_active'
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
              message:"No Data Found in Items",
              data:result.rows,
              total:result.count
          })
      }else{
    
        res.status(200).send({
            message:"Success",
            data:result.rows,
            total:result.count
        });
      }
  });
};

const detail = (req,res) => {
  var id = req.params.id;
  
  Items.findOne({
      attributes:[
        'id',
        'brand',
        'model',
        'is_active',
        'createdAt',
        'updatedAt'
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
    const existItem = await Items.findOne({
        where:{
            brand: req.body.brand,
            model: req.body.model,
            id: { [Op.ne]: req.body.id }
        }
    });

    if(existItem){
        if(existItem){
            return res.status(200).send({
                is_ok:false,
                message:"Data is already exist"
            });
        }
    }

  const t = await sequelize.transaction();
  try{
      var data = {
        brand:req.body.model,
        brand:req.body.brand,
        is_active:req.body.is_active
      }
      console.log(data);
      
      await Items.update(data,{
        where:{
          id:req.body.id
        },
        transaction: t
      });

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
  const existItem = await Items.findOne({
      where:{
          brand: req.body.brand,
          model: req.body.model
      }
  });

  if(existItem){
      return res.status(200).send({
          is_ok:false,
          message:"Data is already exist"
      });
  }

  const t = await sequelize.transaction();
  try{
      var data = {
        brand:req.body.brand,
        model:req.body.model,
        is_active:req.body.is_active
      }
      
      await Items.create(data,{transaction: t});

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

const listBrand = (req,res) => {

  var param_order = ['brand', "asc"];
  var where_query = {'is_active':true}

  Items.findAll({
      attributes:[
        'brand',
      ],
      where: where_query,
      order: [param_order],
      group: ['brand'],
      raw:true
  })
  .then(result => {
      if(result.count == 0){
          res.status(200).send({
              message:"No Brand Found in Items",
              data:result
          })
      }else{
            const brandList = result.map(item => item.brand);
            res.status(200).send({
                message:"Success",
                data:brandList
            })
      }
  });
};

const listModel = (req,res) => {

    var param_order = ['model', "asc"];
    var where_query = {
        'is_active':true
    }

    where_query = {
        ...where_query,
        brand:req.body.brand
    }
  
    Items.findAll({
        attributes:[
          ['id','item_id'],
          'model',
        ],
        where: where_query,
        order: [param_order],
        raw:true
    })
    .then(result => {
        if(result.count == 0){
            res.status(200).send({
                message:"No Model Found in Items",
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

module.exports = {
    create,
    list,
    detail,
    update,
    listBrand,
    listModel
}