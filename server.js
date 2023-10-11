require("dotenv").config();

var express = require("express");


app = express();


const https = require('https');
const fs = require('fs');
// Set the port of our application
// process.env.PORT lets the port be set by Heroku
var PORT = process.env.PORT || 8443;
var keys = require("./keys");

var key = fs.readFileSync(__dirname + '/selfsigned.key');
var cert = fs.readFileSync(__dirname + '/selfsigned.crt');
var options = {
  key: key,
  cert: cert
};

// Sets up the Express app to handle data parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

var mysql = require("mysql"),

if(process.env.JAWSDB_URL){
  connection=mysql.createConnection(process.env.JAWSDB_URL);
} else {
  connection = mysql.createConnection({
    host: "ik1eybdutgxsm0lo.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    port: 3306,
    user: "bwyuv8k63yzoqnfk",
    password: "vwbztu1besejubwy",
    database: "xne6rzwif22ragpq"
  });
}

  
  
connection.connect(function(err) {
  if (err) {
    console.error("error connecting: " + err.stack);
    return;
  }

  console.log("connected as id " + connection.threadId);
});

// // Use Handlebars to render the main index.html page with the coyotes in it.
app.get("/", function(req, res) {
  connection.query("SELECT * FROM coyotes", function(err, data) {
    if (err) {
      return res.status(500).end();
    }
    // console.log(data)
    // console.log(req.body,res.body)
    res.render("index", { coyotes: data });
  });
});

// // Create a new coyote
app.post("/Coyotes", function(req, res) {
    console.log(req.body);
  connection.query(
    "INSERT INTO coyotes (coyoteName, longitude, latitude, dtime, active) VALUES (?, ?, ?, ?, ?)",
     [req.body.coyoteName, req.body.longitude, req.body.latitude, req.body.dtime, req.body.active], function(err, result, response) {
    console.log(result);
    console.log(response);
    if (err) {
      console.log(err);
      return res.status(503).end();
    }

    // Send back the ID of the new coyote
    res.json({ result });
    console.log({ id: result.insertId });
  });
});

// Retrieve all coyotes
app.get("/Coyotes", function(req, res) {
  connection.query("SELECT * FROM coyotes;", function(err, data) {
    if (err) {
      return res.status(500).end();
    }

    res.json(data);
  });
});

// Update a coyote
app.put("/Coyotes/:id", function(req, res) {
  console.log(req.params.id)
  connection.query("UPDATE coyotes SET active = true WHERE id = ?", [req.params.id], function(err, result) {
    if (err) {
      // If an error occurred, send a generic server failure
      return res.status(500).end();
    }
    else if (result.changedRows === 0) {
      // If no rows were changed, then the ID must not exist, so 404
      return res.status(404).end();
    }
    res.status(200).end();

  });
});

// Delete a coyote
app.delete("/coyotes/:id", function(req, res) {
  connection.query("DELETE FROM coyotes WHERE id = ?", [req.params.id], function(err, result) {
    if (err) {
      // If an error occurred, send a generic server failure
      return res.status(500).end();
    }
    else if (result.affectedRows === 0) {
      // If no rows were changed, then the ID must not exist, so 404
      return res.status(404).end();
    }
    res.status(200).end();

  });
});

// Start our server so that it can begin listening to client requests.
// app.listen(PORT, function() {
//   // Log (server-side) when our server has started
//   console.log("Server listening on: http://localhost:" + PORT);
// });




app.get('/', (req, res) => {
  res.send('Now using https..');
});

var server = https.createServer(options, app);

server.listen(PORT, () => {
 console.log("server starting on port : " + PORT)
});