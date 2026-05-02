const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.jgws5o6.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const db = client.db('SmartQFlow');
    const appointmentCollection = db.collection('appointment');
    const doctorsCollection = db.collection('doctors'); 

    app.post('/appointment', async(req,res)=>{
        const appintment = req.body;
        const result = await appointmentCollection.insertOne(appintment);
        res.send(result);
    })
    app.get('/appointment/:ticket', async(req,res)=>{
        const appointment = await appointmentCollection.findOne({
            ticketNumber: req.params.ticket
        });
        res.send(appointment)
    })
    app.get('/doctors/:department', async(req, res)=>{
        const dept = req.params.department;
        const doctor = await doctorsCollection.find({department: req.params.department}).toArray();
        res.send(doctor);
    })
    app.patch('/assign/:id', async(req, res)=>{
        const id = req.params.id;
        const docId = req.body.doctorId;
        const query = { _id: new ObjectId(id)};
        const updatedDoc = {
            $set:
            {
                status: 'assigned',
                Assigned_Doctor : docId,
            }
        }
        try{
            const result = await appointmentCollection.updateOne(query,updatedDoc);
            res.send(result);
        }catch(error){
            console.log(error)
        }

    })


    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Smart-Q-Flow Backend is running')
})
app.listen(port, ()=>{
    console.log(`Server is running at ${port}`)
})