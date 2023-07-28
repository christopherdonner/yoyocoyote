var express = require("express");

var app = express();

// Set the port of our application
// process.env.PORT lets the port be set by Heroku
var PORT = process.env.PORT || 8080;

// Sets up the Express app to handle data parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

var mysql = require("mysql");

var connection = mysql.createConnection({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "P@ssw0rd",
  database: "coyote_db"
});

connection.connect(function(err) {
  if (err) {
    console.error("error connecting: " + err.stack);
    return;
  }

  console.log("connected as id " + connection.threadId);
});

// // Use Handlebars to render the main index.html page with the burgers in it.
app.get("/", function(req, res) {
  connection.query("SELECT * FROM coyotes where active=false", function(err, data) {
    if (err) {
      return res.status(500).end();
    }
    connection.query("select * from coyotes where active=true", function(err, resp){
    // console.log(data)
    // console.log(req.body,res.body)
    res.render("index", { burgers: data, oldBurgers: resp });
    })
  });
});

// // Create a new burger
// app.post("/Burgers", function(req, res) {
//     console.log(req.body)
//   connection.query("INSERT INTO burgers (burgerName, devoured) VALUES (?, false)", [req.body.Burger], function(err, result) {
//     if (err) {
//       return res.status(503).end();
//     }

//     // Send back the ID of the new burger
//     res.json({ id: result.insertId });
//     console.log({ id: result.insertId });
//   });
// });

// // Retrieve all burgers
// app.get("/Burgers", function(req, res) {
//   connection.query("SELECT * FROM burgers;", function(err, data) {
//     if (err) {
//       return res.status(500).end();
//     }

//     res.json(data);
//   });
// });

// // Update a burger
// app.put("/Burgers/:id", function(req, res) {
//   console.log(req.params.id)
//   connection.query("UPDATE burgers SET devoured = true WHERE id = ?", [req.params.id], function(err, result) {
//     if (err) {
//       // If an error occurred, send a generic server failure
//       return res.status(500).end();
//     }
//     else if (result.changedRows === 0) {
//       // If no rows were changed, then the ID must not exist, so 404
//       return res.status(404).end();
//     }
//     res.status(200).end();

//   });
// });

// // Delete a burger
// app.delete("/burgers/:id", function(req, res) {
//   connection.query("DELETE FROM burgers WHERE id = ?", [req.params.id], function(err, result) {
//     if (err) {
//       // If an error occurred, send a generic server failure
//       return res.status(500).end();
//     }
//     else if (result.affectedRows === 0) {
//       // If no rows were changed, then the ID must not exist, so 404
//       return res.status(404).end();
//     }
//     res.status(200).end();

//   });
// });

// Start our server so that it can begin listening to client requests.
app.listen(PORT, function() {
  // Log (server-side) when our server has started
  console.log("Server listening on: http://localhost:" + PORT);
});