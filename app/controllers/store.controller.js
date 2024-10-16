const db = require("../models");
const DC = db.dcs;
const Store = db.stores;
const Company = db.companies;
const Op = db.Sequelize.Op;
const fs = require("fs");
const path = require("path");
const reader = require('xlsx');
const { sequelize, Sequelize } = require("../models");

const list = (req,res) => {
  /* search by dc name */
  /* search by company name */

  /* 
    search_dc_name
    search_company_name
    page
    page_length
    column_sort
    order
  */

  var page = req.body.page;
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
  
  if(column_sort == 'dc_name'){
    param_order = ['dc','name', order];
  }else{
    param_order = [column_sort,order];
  }

  if(req.body.hasOwnProperty("search_dc_name")){
    if(req.body.search_dc_name != ""){
        where_query = {
            ...where_query,
            '$dc.dc_name$': {
                [Op.iLike]: '%'+req.body.search_dc_name+'%'
            }
        }
    }
  }

  if(req.body.hasOwnProperty("search_store_name")){
    if(req.body.search_dc_name != ""){
        where_query = {
            ...where_query,
            store_name: {
                [Op.iLike]: '%'+req.body.search_store_name+'%'
            }
        }
    }
  }


  Store.findAndCountAll({
      include: [
        { 
          model: DC, 
          as : 'dc',
          attributes: []
        },
      ],
      attributes:[
        'id',
        'store_name',
        'address',
        'createdAt',
        'updatedAt',
        'is_active',
        [Sequelize.col('dc.dc_name'), 'dc_name']
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
              message:"No Data Found in Store",
              data:result.rows,
              total:result.count
          })
      }else{
          res.status(200).send({
              message:"Success",
              data:result.rows,
              total:result.count,
              page:req.body.page,
              item_per_page:10
          })
      }
  });
};

const detail = (req,res) => {
  var id = req.params.id;
  
  Store.findOne({
      include: [
        { 
          model: DC, 
          as : 'dc',
          attributes: []
        },
      ],
      attributes:[
        'id',
        'store_name',
        'is_active',
        'address',
        'createdAt',
        'updatedAt',
        'dc_id',
        [Sequelize.col('dc.dc_name'), 'dc_name']
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

  const existStoreName = await Store.findOne({
      where:{
          store_name: req.body.store_name,
          id: { [Op.ne]: req.body.id }
      }
  });

  if(existStoreName){
      return res.status(200).send({
          is_ok:false,
          message:"Store Name is already exist"
      });
  }

  const existStoreCode = await Store.findOne({
    where:{
        store_code: req.body.store_code,
        id: { [Op.ne]: req.body.id }
    }
});

if(existStoreCode){
    return res.status(200).send({
        is_ok:false,
        message:"Store Code is already exist"
    });
}

  const dcId = await DC.findOne({
      where:{
          id: req.body.dc_id,
          is_active:true
      }
  });

  if(!dcId){
      return res.status(200).send({
          is_ok:false,
          message:"DC is not found"
      });
  }

  const t = await sequelize.transaction();
  try{
      var data = {
        store_code:req.body.store_code,
        store_name:req.body.store_name,
        is_active:req.body.is_active,
        address:req.body.address,
        dc_id:req.body.dc_id
      }
      
      const store = await Store.update(data,{
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

  const existStoreName = await Store.findOne({
      where:{
          store_name: req.body.store_name
      }
  });

  if(existStoreName){
      return res.status(200).send({
          is_ok:false,
          message:"Store Name Already Exist"
      });
  }

  const existStoreCOde = await Store.findOne({
    where:{
        store_code: req.body.store_code
    }
});

if(existStoreCOde){
    return res.status(200).send({
        is_ok:false,
        message:"Store Code is already Exist"
    });
}

  const dcId = await DC.findOne({
      where:{
          id: req.body.dc_id,
          is_active:true
      }
  });

  if(!dcId){
      return res.status(200).send({
          is_ok:false,
          message:"DC is not found"
      });
  }

  const t = await sequelize.transaction();
  try{
      
        var storeData = {
          store_code:req.body.store_code,
          store_name:req.body.store_name,
          is_active:req.body.is_active,
          address:req.body.address,
          dc_id : req.body.dc_id
        }
        console.log(storeData);
        await Store.create(storeData,{transaction: t});
      
      
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

const listStoreOption = (req,res) => {

  var param_order = ['store_name', "asc"];
  var where_query = {'is_active':true}

  where_query = {
    ...where_query,
    dc_id:req.params.dc_id
  }

  Store.findAll({
      attributes:[
        ['id','store_id'],
        'store_name',
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

const upload = async(req, res) => {
  
  return res.status(200).send({
    is_ok: true,
    message: "Successfully Upload : ",
  });

  /*
  try{
    if (req.file == undefined) {
      return res.status(200).send({
        is_ok: false,
        message: "Please upload a excel file!"});
    }
    let dir = __basedir + "/uploads/" + req.file.filename;
    const file = reader.readFile(dir);
    
    const sheets = file.SheetNames

    var result = [];

    console.log(sheets)
    
    const t = await sequelize.transaction();
  
    // for(let i = 0; i < sheets.length; i++)
    // {
      let temp = reader.utils.sheet_to_json(file.Sheets['dc - store'])
      
      for(let j = 0; j < temp.length; j++){
        //console.log(temp)
        var resp = null;
        resp = await updateOrCreateStore(j,temp[j],t);
       
        // if(sheets[i] == "mds.mdm.DealerGroup") resp = await updateOrCreate(MdmDealerGroup,temp[j],t);
        // if(sheets[i] == "mds.mdm.DealerCompany") resp = await updateOrCreate(MdmCompany,temp[j],t);
        // if(sheets[i] == "mds.mdm.Outlet") resp = await updateOrCreate(MdmOutlet,temp[j],t);
        result.push(resp);
      }
    // }
    
    fs.readdir(__basedir + "/uploads/", (err, files) => {
      if (err) throw err;
    
      for (const file of files) {
        fs.unlink(path.join(__basedir + "/uploads/", file), err => {
          if (err) throw err;
        });
      }
    });

    await t.commit();
    return res.status(200).send({
      is_ok: true,
      message: "Successfully Upload : " + req.file.originalname,
      result:result
    });

    }catch(error){
      console.log(error.toString());
      await t.rollback();
      return res.status(200).send({
        is_ok: false,
        message: "Could not upload the file: " + req.file.originalname,
        error:error.toString()
      });
    }
      */
} 

const updateOrCreateStore = async(i,row,t)=>{

  const existCompany = await Company.findOne({
    where:{
      company_code:row["Company Code"]
    },
    transaction: t
  })

  if(!existCompany){
    return {is_ok:false,message:"Company Code is not exist at row "+(i+1)}
  }

  const existDC = await DC.findOne({
    where:{
      dc_code:row["DC Code"]
    },
    transaction: t
  })

  if(!existDC){
    return {is_ok:false,message:"DC Code is not exist at row "+(i+1)}
  }

  
  const existStore = await Store.findOne({
    where:{
      store_code:row["Store Code"]
    },
    transaction:t
  })

  var storeData = {
    dc_id:existDC.id,
    store_name:row["Store Name"],
    is_active:false
  }

  try{
    if(existStore){
      await Store.update(storeData,
        {
          where:{
            id:existStore.id
          },
          transaction:t
        }
      )
      return {is_ok:true,message:"Successfully update at row "+(i+1)}
    }else{
      await Store.create(storeData,{transaction:t})
      return {is_ok:true,message:"Successfully insert at row "+(i+1)}
    }
    
  }catch(e){
    return {is_ok:false,message:error.toString()};
  }
  
    
}

module.exports = {
    create,
    list,
    detail,
    update,
    listStoreOption,
    upload
}