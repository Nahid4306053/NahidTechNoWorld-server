const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const app = express();
dotenv.config();
const port = process.env.PORT;
const cookieParser = require("cookie-parser")
app.use(cookieParser(process.env.SECRETKEY_KEY_F_COOKIE))
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true,
}))
// set static

app.use(express.json())
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { isObject, update } = require('lodash'); 
const { sign, verify } = require('jsonwebtoken');

const uri = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_USER_PASSWORD}@nahidprogramingworld.6llsn4g.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


async function run() {

  try {
    const Brands = client.db("NahidTechNoWorldStore").collection("Brands")
    const Products = client.db("NahidTechNoWorldStore").collection("Products")
    const cart = client.db("NahidTechNoWorldStore").collection("cart")
    //======== middlewares ==============
    app.post("/login", async (req, res) => {
      try {
     
        if (req.body.uid) {
          const uid = req.body.uid
          const token = sign({uid:uid}, process.env.SECRETKEY_KEY_F_JWT, {
            expiresIn: process.env.EXPIRE_TIME
          }); 
          res.cookie(process.env.COOKIE_NAME,token,{sameSite:'none',maxAge:process.env.EXPIRE_TIME,httpOnly:true,signed:true,secure:true});
          res.send('Log in successfully')

        } else {
          res.status(404).json({
            error: "User not found"
          })
        }
      } catch (err) {
        console.log(err)
        res.status(500).json({
          error: "There is server side error"
        })
      }
    })
    const CheckUser = async (req,res,next) =>{
        const token =  req.signedCookies[process.env.COOKIE_NAME];
      
        if(token){
         const user =  verify(token,process.env.SECRETKEY_KEY_F_JWT)
         if(user.uid){
             next()
         }
         else{
          res.status(403).json({error:"User Not Authorized"})
         } 
        }
        else{
          res.status(404).json({error:"User Not Found"})
        }
    }
    
    //================================

    app.get("/brands", async (req, res) => {
      const result = await Brands.find({}, {
        projection: {
          '_id': 1,
          'brand_name': 1,
          'brand_logo': 1,
        }
      }).toArray();
      res.status(200).json(result)
    })
    
    app.get("/", (req, res) => {
      res.send("app is running...")
    })

    app.get("/related/product/:id",CheckUser, async (req, res) => {
      const result = await Products.find({
        'type': req.query.type,
        '_id': {
          $ne: new ObjectId(req.params.id)
        }
      }).limit(3).toArray();
      res.status(200).json({
        data: result
      })
    })

    app.post("/product", async (req, res) => {
      const result = await Products.insertOne({
        ...req.body,
        createdAt: new Date()
      })
      res.status(200).json(result);
    })

    app.post('/cart' , CheckUser ,async (req, res) => {
      const result = await cart.insertOne({
        ...req.body,
        pid: new ObjectId(req.body.pid)
      });
      res.send(result)
    })

    app.get("/cart/:uid" , async (req, res) => {
      const result = await cart.aggregate([{
          $match: {
            "uid": req.params.uid
          }
        },
        { 
          $lookup: {
            from: 'Products',
            localField: 'pid',
            foreignField: '_id',
            as: 'product'
          }
        }
      ]).toArray()

      res.send(result);
    })

    app.delete('/cart/:id', async (req, res) => {
      const result = await cart.deleteOne({
        '_id': new ObjectId(req.params.id)
      })
      res.send(result);
    })

    app.get("/product/new", async (req, res) => {
      const result = await Products.find().sort({
        'createdAt': -1
      }).limit(6).toArray()
      res.status(200).json({
        data: result
      })
    })

    app.get("/product/top", async (req, res) => {
      const result = await Products.find().sort({
        'rating': -1
      }).limit(6).toArray()
      res.status(200).json({
        data: result
      })
    })

    app.get("/product/:id", async (req, res) => {
      const result = await Products.findOne({
        "_id": new ObjectId(req.params.id)
      });
      res.send(result)
    })

    app.get("/brand/:id", async (req, res) => {
      const products = await Products.find({
        "brand.id": req.params.id
      }).toArray()
      const brand = await Brands.findOne({
        "_id": new ObjectId(req.params.id)
      })
      res.status(200).json({
        brand,
        products
      })

    })


    app.get('/product/singel/:id' , async (req, res) => {
      const product = await Products.findOne({
        "_id": new ObjectId(req.params.id)
      })
      if (Object.keys(product).length > 0) {
        res.status(200).json({
          product
        })
      } else {
        res.status(404).json({
          error: "Product not found"
        })
      }  
  

      app.put("/product/:id", CheckUser,async (req, res) => {
        const result = await Products.updateOne({
          "_id": new ObjectId(req.params.id)
        }, {
          $set: req.body
        })
        res.send(result)
      })





    })
    console.log("successfully connected to MongoDB!");
  } finally {

  }
}
run().catch((err) => {
  console.log(err)
  throw new Error(`${err}`)
});

// default error handelar
app.use((err, req, res, next) => {
  if (err) {
    res.status(200).json({
      error: err
    });
  }
});

app.listen(port, () => {
  console.log('Server is running on port ' + port)
})
