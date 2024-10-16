const moment = require('moment')
const db = require("../models");
const Asset = db.assets;
const DC = db.dcs;
const Store = db.stores;
const Item = db.items;
const Op = db.Sequelize.Op;
const { sequelize, Sequelize } = require("../models");

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
  
  if(column_sort == 'dc'){
    param_order = ['dc','name', order];
  }else if(column_sort == 'store'){
    param_order = ['store','name', order];
  }else{
    param_order = [column_sort,order];
  }

  if(req.body.hasOwnProperty("search_serial_number")){
    if(req.body.search_serial_number){
      where_query = {
        ...where_query,
        serial_number: {
          [Op.iLike]: '%'+req.body.search_serial_number+'%'
        }
      }
    }
  }


  if(req.body.hasOwnProperty("search_dc_name")){
    if(req.body.search_dc_name != ""){
      where_query = {
        ...where_query,
          '$dc.name$': {
            [Op.iLike]: '%'+req.body.search_dc_name+'%'
          }
      }
    }
  }

  if(req.body.hasOwnProperty("search_store_name")){
    if(req.body.search_store_name != ""){
      where_query = {
        ...where_query,
          '$store.name$': {
            [Op.iLike]: '%'+req.body.search_store_name+'%'
          }
      }
    }
  }

  Asset.findAndCountAll({
      include: [
        { 
          model: DC, 
          as : 'dc',
          attributes: []
        },
        { 
            model: Store, 
            as : 'store',
            attributes: []
          },
      ],
      attributes:[
        'id',
        'serial_number',
        'waranty_status',
        'waranty_date',
        'createdAt',
        'updatedAt',
        'is_active',
        [Sequelize.col('dc.dc_name'), 'dc_name'],
        [Sequelize.col('store.store_name'), 'store_name']
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
              message:"No Data Found in Asset",
              data:result.rows,
              total:result.count
          })
      }else{
        const formattedRows = result.rows.map(row => ({
          ...row,
          waranty_date: row.waranty_date 
            ? moment(row.waranty_date).format('YYYY-MM-DD') 
            : "" // Empty string if no waranty_date
        }));
    
    
        res.status(200).send({
            message:"Success",
            data:formattedRows,
            total:result.count
        });
      }
  });
};

const detail = (req,res) => {
  var id = req.params.id;
  
  Asset.findOne({
    include:[
      { 
        model: Item, 
        as : 'item',
        attributes: []
      },
    ],
      attributes:[
        'id',
        'serial_number',
        'dc_id',
        'store_id',
        'is_active',
        'waranty_status',
        'waranty_date',
        'createdAt',
        'updatedAt',
        [Sequelize.col('item.brand'), 'brand'],
        'item_id'
      ],
      where:{id:id}
  }).then(result=>{
      
    const formattedResult = {
      ...result.dataValues,
      waranty_date: result.waranty_date ? moment(result.waranty_date).format('YYYY-MM-DD') : ""
    }
    console.log(formattedResult)

    res.status(200).send({
        message:"Success",
        data:formattedResult
    });
  })
}

async function update (req,res) {
  console.log("UPDATE");
  const existDC = await DC.findOne({
      where:{
          id: req.body.dc_id
      }
  });

  if(!existDC){
      return res.status(200).send({
          is_ok:false,
          message:"DC is Not found"
      });
  }

  const existStore = await Store.findOne({
    where:{
        id: req.body.store_id
      }
  });

  if(!existStore){
      return res.status(200).send({
          is_ok:false,
          message:"Store is Not found"
      });
  }

  const existSerialNumber = await Asset.findOne({
    where:{
      serial_number: req.body.serial_number,
      id: { [Op.ne]: req.body.id }
    }
  });

  if(existSerialNumber){
    return res.status(200).send({
      is_ok:false,
      message:"Serial number is exist"
    });
  }

  const t = await sequelize.transaction();
  try{
      var data = {
        serial_number:req.body.serial_number,
        dc_id:req.body.dc_id,
        store_id:req.body.store_id,
        is_active:req.body.is_active,
        waranty_status: req.body.waranty_status,
        waranty_date: req.body.waranty_date,
        item_id: req.body.item_id
      }
      console.log(data);
      
      await Asset.update(data,{
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
  const existDC = await DC.findOne({
      where:{
          id: req.body.dc_id
      }
  });

  if(!existDC){
      return res.status(200).send({
          is_ok:false,
          message:"DC is Not found"
      });
  }

  const existStore = await Store.findOne({
    where:{
        id: req.body.store_id
      }
  });

  if(!existStore){
      return res.status(200).send({
          is_ok:false,
          message:"Store is Not found"
      });
  }

  const existSerialNumber = await Asset.findOne({
    where:{
      serial_number: req.body.serial_number
    }
  });

  if(existSerialNumber){
    return res.status(200).send({
      is_ok:false,
      message:"Serial number is exist"
    });
  }

  const t = await sequelize.transaction();
  try{
      var data = {
        serial_number:req.body.serial_number,
        dc_id:req.body.dc_id,
        store_id:req.body.store_id,
        is_active:req.body.is_active,
        waranty_status: req.body.waranty_status,
        waranty_date: req.body.waranty_date,
        item_id: req.body.item_id
      }
      
      await Asset.create(data,{transaction: t});

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

const listOption = (req,res) => {

  var param_order = ['company_name', "asc"];
  var where_query = {'is_active':true}

  Companies.findAll({
      attributes:[
        ['id','company_id'],
        'company_name',
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

module.exports = {
    create,
    list,
    detail,
    update,
    listOption
}