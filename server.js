let express = require("express"),
    exphbs = require("express-handlebars"),
    mysql = require("mysql"),

    app = express(),
    port = process.env.PORT || 8080,
    connection = mysql.createConnection({
        host: "localhost",
        port: 3306,
        user: "root",
        password: "P@ssw0rd",
        database: "coyotes_db"
      });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

connection.connect(function(err) {
    if (err) {
      console.error("error connecting: " + err.stack);
      return;
    }
  
    console.log("connected as id " + connection.threadId);
  });

  // Start our server so that it can begin listening to client requests.
app.listen(PORT, function() {
  // Log (server-side) when our server has started
  console.log("Server listening on: http://localhost:" + PORT);
});
  