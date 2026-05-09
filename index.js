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
    await client.connect();
    const db = client.db('SmartQFlow');
    const appointmentCollection = db.collection('appointment');
    const doctorsCollection = db.collection('doctors'); 
    const roomsCollection = db.collection('rooms');

    app.post('/appointment', async (req, res) => {
      const appointment = {
        ...req.body,
        status: "waiting",
        createdAt: new Date()
      };
      const result = await appointmentCollection.insertOne(appointment);
      res.send(result);
    });
    app.get("/appointments", async (req, res) => {
      try {
        const result = await appointmentCollection.find({}).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
        res.status(500).send({ error: "Failed to fetch appointments" });
      }
    });
    app.get('/rooms', async (req, res) => {
      const result = await roomsCollection.find({}).toArray();
      res.send(result);
    });
    app.get('/appointment/:ticket', async(req,res)=>{
        const appointment = await appointmentCollection.findOne({
            ticketNumber: req.params.ticket
        });
        res.send(appointment)
    })
    // app.get('/appointments/:dept', async(req,res)=>{
    //     const appointment = await appointmentCollection.find({department: req.params.dept, status: "paid" }).toArray();
    //     res.send(appointment);
    // })
    app.get('/appointments/:dept', async(req,res)=>{
        const appointment = await appointmentCollection.find({
            department: req.params.dept,
            status: "waiting"
        }).sort({
            createdAt: 1
        }).toArray();   
        res.send(appointment);
    })
    app.get('/doctors/:department', async(req, res)=>{
        const dept = req.params.department;
        const doctor = await doctorsCollection.find({department: req.params.department}).toArray();
        res.send(doctor);
    })
    app.get('/rooms/:dept', async(req,res)=>{
        const result = await roomsCollection.find({
            department: req.params.dept
        }).toArray();
        res.send(result);
    })
  
    app.patch('/appointments/auto-assign/:patientId', async (req, res) => {
        const patientId = req.params.patientId;
        const patient = await appointmentCollection.findOne({
            _id: new ObjectId(patientId)
        });
      
        if (!patient) {
            return res.status(404).send({
                message: "Patient not found"
            });
        }
      

        const rooms = await roomsCollection.find({
            department: patient.department
        }).toArray();
      
        if (rooms.length === 0) {
            return res.status(404).send({
                message: "No room available"
            });
        }
      

        let selectedRoom = null;
        let minimumQueue = Infinity;
      
        for (const room of rooms) {
        
            const count = await appointmentCollection.countDocuments({
                assignedRoomId: room._id.toString(),
                status: {
                    $in: ["assigned", "in-progress"]
                }
            });
          
            if (count < minimumQueue) {
                minimumQueue = count;
                selectedRoom = room;
            }
        }
    
    await appointmentCollection.updateOne(
            {
                _id: new ObjectId(patientId)
            },
            {
                $set: {
                    assignedRoomId: selectedRoom._id.toString(),
                    assignedDoctorId: selectedRoom.doctorId,
                    status: "assigned"
                }
            }
        );    

        res.send({
            success: true,
            room: selectedRoom
        });
    });
    app.get("/appointments/room/:roomId", async(req,res)=>{
      const result = await appointmentCollection
        .find({
          assignedRoomId: req.params.roomId,
          status: {
            $in: [
              "assigned",
              "in-progress"
            ]
          }
        })
        .sort({
          createdAt: 1
        })
        .toArray()     

      res.send(result)
    })
    app.patch("/appointments/call-next/:roomId", async (req, res) => {
         const roomId = req.params.roomId;

         await appointmentCollection.updateMany(
           {
             assignedRoomId: roomId,
             status: "in-progress"
           },
           {
             $set: { status: "completed" }
           }
         );
     
         
         const next = await appointmentCollection.findOne(
           {
             assignedRoomId: roomId,
             status: "assigned"
           },
           {
             sort: { createdAt: 1 }
           }
         );
     
         if (!next) {
           return res.send({ message: "No patient" });
         }
     
         
         await appointmentCollection.updateOne(
           { _id: next._id },
           {
             $set: { status: "in-progress" }
           }
         );
     
         res.send({ success: true });
    });
    app.patch("/appointments/complete/:id", async (req, res) => {
        const result = await appointmentCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          {
            $set: {
              status: "completed"
            }
          }
        );

        res.send(result);
    });
    app.patch("/appointments/mark-ready/:id", async (req, res) => {
      const result = await appointmentCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        {
          $set: {
            status: "paid"
          }
        }
      );    

      res.send(result);
    });
    
  } finally {
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Smart-Q-Flow Backend is running')
})
module.exports = app;