const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const shortId = require('shortid')
const cors = require('cors')

const mongoose = require('mongoose')
//mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const connection = mongoose.connection;
connection.on('error', console.error.bind(console, 'connection error:'));
connection.once('open', function() {
  console.log("we're connected!");
});
app.use(cors())

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const trackerSchema = new mongoose.Schema({
  _id: String,
  username: String,
  exercise: [{
    description: String,
    duration: String,
    date: Date
  }]
});

const trackerModel = mongoose.model("trackerModel", trackerSchema);

app.get("/api/exercise/new-user", (req, res) => {
  res.send("works!!");
})

app.post("/api/exercise/new-user", (req, res) => {
  trackerModel.findOne({ username: req.body.username }, (err, data) => {
    if (data) {
      res.send("Username already taken");
    }
    else {

      let tempModel = new trackerModel({
        _id: shortId.generate(),
        username: req.body.username,
      });
      tempModel.save(err, data => {
        if (err) return console.log(err);
        res.json({ username: tempModel.username, _id: tempModel._id });
      });
    }
  });
});

app.get("/api/exercise/users", (req, res) => {
  trackerModel.find({}, (err, data) => {
    if (err) return console.log(err);
    let responseArray = [];
    for (let i in data) {
      responseArray.push({ username: data[i].username, _id: data[i]._id });
    }
    res.json(responseArray);
  });
});

app.post("/api/exercise/add", (req, res) => {
  if (!req.body.userId || !req.body.description || !req.body.duration) {
    res.send("Missing required fields");
  }
  let tempDate = req.body.date ? new Date(req.body.date).toDateString() : new Date().toDateString();
  let tempDuration = parseInt(req.body.duration);
  let tempExercise = {
    description: req.body.description,
    duration: tempDuration,
    date: tempDate
  }
  trackerModel.findByIdAndUpdate(
    req.body.userId,
    {
      $push: {
        exercise: tempExercise
      }
    },
    {useFindAndModify: false},
    (err,data)=>{
      if(err){
        return console.log(err);
      }
      res.json({
        _id: data._id,
        username: data.username,
        description: tempExercise.description,
        duration: tempExercise.duration,
        date: tempExercise.date,
      });
    }
  );

});

app.get("/api/exercise/log",(req,res)=>{
  let userId = req.query.userId;
  let startDate = req.query.from;
  let endDate = req.query.to;
  let limit = req.query.limit;
  let userResponse = {};
  if(!startDate && !endDate )
  {
    trackerModel.findById(userId,(err,data)=>{
      if(err) return console.log(err);
      if(data==null) res.send("No user found.");
      let log = [];
      let _limit = limit===undefined?data.exercise.length:Math.min(limit,data.exercise.length);
      for(let i=0;i<_limit;i++)
      {
        log.push({
          description: data.exercise[i].description,
          duration: data.exercise[i].duration,
          date: data.exercise[i].date
        });
      }
      userResponse = {
        _id: data._id,
        username: data.username,
        count: log.length,
        log: log
      }
      res.json(userResponse);

    });
  }
  else{
    trackerModel.find({
      _id: userId,
      exercise: {$elemMatch: {date: {$gte: startDate, $lte: endDate}}}
    },
      (err,data)=>{
      if(err) return console.log("Error: ",err);
      if(data[0]==null)
      {
        res.send("Not found");
      }
      
      let log = [];
      let _limit = limit===undefined?data[0].exercise.length:Math.min(limit,data[0].exercise.length);
      //console.log(_limit);
      for(let i=0;i<_limit;i++)
      {
        log.push({
          description: data[0].exercise[i].description,
          duration: data[0].exercise[i].duration,
          date: data[0].exercise[i].date
        });
      }

      userResponse = {
        _id: data[0]._id,
        username: data[0].username,
        count: log.length,
        log: log
      }
      res.json(userResponse);
    }
    );
  
}
  
  
});


// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: 'not found' })
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
