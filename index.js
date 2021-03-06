const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { query } = require('express');
const { get } = require('express/lib/response');
const { ObjectID } = require('bson');
require('dotenv').config();
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express()
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7jjlo.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' })
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}


async function run() {
    try {
        await client.connect();


        const productCollection = client.db('Bycycle-store').collection('products');
        const orderCollection = client.db('Bycycle-store').collection('order');
        const userCollection = client.db('Bycycle-store').collection('users');
        const reviewCollection = client.db('Bycycle-store').collection('review');


        // const verifyAdmin = async (req, res, next) => {
        //     const requester = req.decoded.email;
        //     const requesterAccount = await userCollection.findOne({ email: requester });
        //     if (requesterAccount.role === 'admin') {
        //         next();
        //     }
        //     else {
        //         res.status(403).send({ message: 'forbidden' });
        //     }
        // }
        function verifyJWT(req, res, next) {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).send({ message: 'UnAuthorized access' })
            }

            const token = authHeader.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
                if (err) {
                    return res.status(403).send({ message: 'Forbidden access' })
                }
                req.decoded = decoded;
                next();
            })
        }



        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users)
        });

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })


        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: email }
                const updateDoc = {
                    $set: { role: 'admin' },
                }
                const result = await userCollection.updateOne(filter, updateDoc)
                res.send(result)

            }
            else {
                res.status(403).send({ message: 'forbidden' });
            }









        });
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email }
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            }
            const result = await userCollection.updateOne(filter, updateDoc, options)
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
            res.send({ result, token })


        });

        // app.get('/order', async (req, res) => {
        //     const email = req.query.email;
        //     const query = { email: email };
        //     const orders = await orderCollection.find(query).toArray();
        //     res.send(orders)

        // })

        app.get('/order', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const authorization = req.headers.authorization;
            console.log('auth headers', authorization);
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const orders = await orderCollection.find(query).toArray();
                return res.send(orders)
            }
            else {
                return res.status(403).send({ message: 'Forbidden access' })
            }

        });

        app.get('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectID(id) }
            const order = await orderCollection.findOne(query);
            res.send(order)

        })

        app.post('/order', verifyJWT, async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })
        app.get('/order', async (req, res) => {
            const query = {};
            const result = await orderCollection.find(query);
            res.send(result);
        })


        // payment for specific order
        // app.get("/order/:id", verifyJWT, async (req, res) => {
        //     const id = req.params.id;
        //     const order = await orderCollection.findOne({ _id: ObjectId(id) });
        //     res.send(order);
        // });

        // // payment system
        // app.post("/create-payment-intent", verifyJWT, async (req, res) => {
        //     const order = req.body;
        //     const price = order.price;
        //     const amount = price * 100;
        //     console.log(amount);
        //     const paymentIntent = await stripe.paymentIntents.create({
        //         amount: amount,
        //         currency: "usd",
        //         payment_method_types: ["card"],
        //     });
        //     res.send({ clientSecret: paymentIntent.client_secret });
        // });

        // // payment update

        // app.patch("/order/:id", verifyJWT, async (req, res) => {
        //     const id = req.params.id;
        //     const payment = req.body;
        //     const filter = { _id: ObjectId(id) };
        //     const updatedDoc = {
        //         $set: {
        //             paid: true,
        //             transactionId: payment.transactionId,
        //         },
        //     };
        //     const result = await paymentCollection.insertOne(payment);
        //     const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
        //     res.send(updatedOrder);
        // });









        app.get('/review', async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews);


        })
        app.post('/review', verifyJWT, async (req, res) => {
            const newReview = req.body;
            const result = await reviewCollection.insertOne(newReview);
            res.send(result)
        })

        app.get('/product', async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);


        })
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const cursor = await productCollection.findOne(filter);

            // const products = await cursor.toArray();
            res.send(cursor);
            console.log(cursor);
        })

        app.post('/product', verifyJWT, async (req, res) => {
            const newProduct = req.body;
            const result = await productCollection.insertOne(newProduct);
            res.send(result)
        })
        app.delete('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            res.send(result)
        })





    }

    finally {

    }
}

run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Hello Bicycle World!')
})

app.listen(port, () => {
    console.log(`Bicycle app listening on port ${port}`)
})