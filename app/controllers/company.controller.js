const db = require("../models");
const Companies = db.companies;
const Users = db.users;
const Op = db.Sequelize.Op;
const { sequelize, Sequelize } = require("../models");
const { createPagination, createPaginationNoData } = require("../helpers/pagination");

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
  
  if(column_sort == 'agent'){
    param_order = ['user','name', order];
  }else{
    param_order = [column_sort,order];
  }

  if(req.body.hasOwnProperty("search_company_name")){
    where_query = {
      company_name: {
        [Op.iLike]: '%'+req.body.search_company_name+'%'
      }
    }
  }


  if(req.body.hasOwnProperty("search_agent_name")){
    where_query = {
        '$user.name$': {
          [Op.iLike]: '%'+req.body.search_agent_name+'%'
        }
    }
  }

  Companies.findAndCountAll({
      include: [
        { 
          model: Users, 
          as : 'user',
          attributes: []
        },
      ],
      attributes:[
        'id',
        'company_name',
        'contact_name',
        'contact_number',
        'createdAt',
        'updatedAt',
        'is_active',
        [Sequelize.col('user.name'), 'agent_name']
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
        message: "No Data Found in Company",
        data: result.rows,
        payload: createPaginationNoData(page, total_pages, page_length, 0)
      });
    } else {
      console.log(page)
      console.log(total_pages)
      
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
  
  Companies.findOne({
      include: [
        { 
          model: Users, 
          as : 'user',
          attributes: []
        },
      ],
      attributes:[
        'id',
        'company_name',
        'contact_name',
        'contact_number',
        'is_active',
        'createdAt',
        'updatedAt',
        'default_agent_id',
        'company_code',
        [Sequelize.col('user.name'), 'agent_name']
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

  /* 
    {
      "company_name":"test2",
      "is_active":true,
      "contact_name":"John",
      "contact_number":"0898899998888",
      "agent_id":2
    }
  */

  var request = req.body;
  console.log(request);
  var id = request.id;
  // delete req.body.id;

  if(request.hasOwnProperty("created_at")) delete request.created_at

  if(request.contact_name == "") delete request.contact_name

  if(request.contact_number == "") delete request.contact_number
  

  if(request.hasOwnProperty('contact_number') && request.contact_number != ""){
    if(!request.contact_number.includes('+62')){
      return res.status(200).send({
        is_ok:false,
        message:"Phone Number must start with +62"
      });
    }
  }

  const existCompanyCode = await Companies.findOne({
    where:{
        company_code: {
          [Op.iLike]: req.body.company_code
        },
        id: { 
          [Op.ne]: req.body.id 
        }
    }
  });

  if(existCompanyCode){
      return res.status(200).send({
          is_ok:false,
          message:"Company Code is already exist"
      });
  }
  
  //const t = await sequelize.transaction();
  try {
    const updatedCompanies = await Companies.update(request,{
      where:{id:id}
  });
    //await t.commit();
    return res.status(200).send({
      is_ok:true,
      message:"Successfully update",
      data:updatedCompanies
    });
  } catch (error) {
    //await t.rollback();
    return res.status(200).send({
      is_ok:true,
      message:"error",
      data:error
    });
  }
}

async function create (req,res){
  if(req.body.hasOwnProperty('contact_number') && req.body.contact_number != ""){
    if(!req.body.contact_number.includes('+62')){
      return res.status(200).send({
        is_ok:false,
        message:"Phone Number must start with +62"
      });
    }
  }

  const existCompanyCode = await Companies.findOne({
    where:{
        company_name: {
          [Op.iLike]: req.body.company_code
        }
    }
});

if(existCompanyCode){
    return res.status(200).send({
        is_ok:false,
        message:"Company Code is already exist"
    });
}

  const existCompany = await Companies.findOne({
      where:{
          company_name: req.body.company_name
      }
  });

  if(existCompany){
      return res.status(200).send({
          is_ok:false,
          message:"Company Name is already exist"
      });
  }

  const t = await sequelize.transaction();
  try{
      var data = {
        company_name:req.body.company_name,
        is_active:req.body.is_active,
        contact_name:req.body.contact_name,
        contact_number:req.body.contact_number,
        company_code:req.body.company_code
      }
      
      await Companies.create(data,{t});

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