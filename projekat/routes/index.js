var express = require('express');
var router = express.Router();
const flash = require("express-flash");
const session = require("express-session");

var pg=require('pg');

const bcrypt = require('bcrypt');
const saltRounds = 10;
const myPlaintextPassword = 's0/\/\P4$$w0rD';
const someOtherPlaintextPassword = 'not_bacon';

const passport = require("passport");
const initializePassport = require("../passportConfig");
initializePassport(passport);

var config = {
  user: 'postgres', //env var: PGUSER
  database: 'postgres', //env var: PGDATABASE
  password: 'ajsabaza', //env var: PGPASSWORD
  host: 'localhost', // Server hosting the postgres database
  port: 5432, //env var: PGPORT
  max: 100, // max number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
};
var pool = new pg.Pool(config);

let db = {
  getRestorani: function (req,res,next){
    pool.connect(function (err,client,done) {
      if(err){
        res.end('{"error" : "Error", "status" : 500}');
      }
      client.query("select * from restoran ;", [], function (err,result) {
        done();
        if(err){
          console.info(err);
          res.sendStatus(500);
        }
        else {
          req.restorani=result.rows;
          next();
        }
      });
    });
  },
  getVrstaJela: function (req,res,next){
    pool.connect(function (err,client,done) {
      if(err){
        res.end('{"error" : "Error", "status" : 500}');
      }
      client.query("select * from vrsta_jela ;", [], function (err,result) {
        done();
        if(err){
          console.info(err);
          res.sendStatus(500);
        }
        else {
          req.vrsta_jela=result.rows;
          next();
        }
      });
    });
  }
}


/* GET home page. */

router.get('/', checkAuthenticated,function(req, res, next) {
  res.render('index', { title: 'Express' });
});


router.post(
    "/login",
    passport.authenticate("local", {
      successRedirect: "/restorani/",
      failureRedirect: "/",
      failureFlash: true

    })

);

router.get('/registracija', checkAuthenticated,function(req, res, next) {
  res.render('registracija', { title: 'Express' });
});


router.post('/registracijaa',async function(req, res, next) {
  req.ime=req.body.ime;
  req.prezime=req.body.prezime;
  req.email=req.body.email;
  req.pass=req.body.pass;

  req.tel=req.body.br;
  req.longitude=req.body.longitude;
  req.latitude=req.body.latitude;
  console.info(req.longitude,req.latitude);
  req.hashedPassword = await bcrypt.hash(req.pass, 10);

  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("select * from korisnici where email=$1;", [req.email], function (err,result) {
      done();
      if(err){
        console.info(err);
        res.sendStatus(500);

      }
      else {
        if (result.rows.length > 0) {
          console.info("email vec postoji");
          return res.render("registracija", {
            message: "Email vec postoji"
          });
        }
        else{
          next();
        }

      }
    });
  });

}, function (req, res, next){
  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("insert into korisnici (ime,prezime,email,pasvord,br_tel,longitude,latitude) values ($1,$2,$3,$4,$5,$6,$7) returning id, pasvord;", [req.ime,req.prezime,req.email,req.hashedPassword,req.tel,req.longitude,req.latitude], function (err,result) {
      done();
      if(err){
        console.info(err);
        res.sendStatus(500);

      }
      else {
        req.flash("success_msg", "You are now registered. Please log in");
        res.redirect('/');
      }
    });
  });
});

router.get("/logout", (req, res) => {
  req.logout();
  res.render("index", { message: "You have logged out successfully" });
});


router.get('/pocetna', function(req, res, next) {
  res.render('pocetna', {  });
});

router.get('/restorani',checkNotAuthenticated, db.getRestorani,db.getVrstaJela,function(req, res, next) {

  res.render('restorani', { restorani:req.restorani ,vrsta:req.vrsta_jela, tip:req.user.tip,id:req.user.id});

});

router.get('/restorani/meni/:k', function(req, res, next) {
  var restoran=req.params.k;

  console.info(req.user.id);

  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("select j.*, r.naziv as restoran_naziv from jelo j inner join restoran r on r.id=j.id_restorana where id_restorana=$1 ;", [restoran], function (err,result) {
      done();
      if(err){
        console.info(err);
        res.sendStatus(500);

      }
      else {

        req.jela=result.rows;
        req.restoran=restoran;
        next();

      }
    });
  });

}, function (req,res,next){

  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("select a.*,j.naziv,j.status,j.id_restorana,j.cijena,j.slika,r.naziv as ime_restorana from akcija a inner join jelo j on j.id=a.id_jela inner join restoran r on r.id=j.id_restorana where j.id_restorana=$1 ;", [req.restoran], function (err,result) {
      done();
      if(err){
        console.info(err);
        res.sendStatus(500);

      }
      else {
        console.info(result.rows);
        req.akcija=result.rows;
        res.render('meni', { jela:req.jela, akcija:req.akcija });
      }
    });
  });

});

router.get('/ponuda/jela/:k', function(req, res, next) {
  var tip=req.params.k;
  //console.info(restoran);

  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("select j.*, r.naziv as restoran_naziv from jelo j inner join restoran r on r.id=j.id_restorana where tip=$1 ;", [tip], function (err,result) {
      done();
      if(err){
        console.info(err);
        res.sendStatus(500);

      }
      else {

        req.jela=result.rows;
        req.id=tip;
        next();

      }
    });
  });

}, function (req,res,next){

  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("select a.*,j.naziv,j.status,j.id_restorana,j.cijena,j.slika,r.naziv as restoran_naziv  from akcija a inner join jelo j on j.id=a.id_jela  inner join restoran r on r.id=j.id_restorana where j.tip=$1 ;", [req.id], function (err,result) {
      done();
      if(err){
        console.info(err);
        res.sendStatus(500);

      }
      else {
        console.info(result.rows);
        req.akcija=result.rows;
        res.render('meni', { jela:req.jela, akcija:req.akcija });
      }
    });
  });

});

router.get('/sve/narudzbe', function(req, res, next) {
  var id=req.user.id;
  //console.info(restoran);

  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("select n.kolicina,n.cijena*kolicina as ukupna_cijena,n.status,vj.naziv as vrsta,r.naziv as restoran,j.naziv,n.datum from narudzba n\n" +
        "    inner join jelo j on j.id=n.id_jela\n" +
        "inner join restoran r on n.id_restorana = r.id inner join vrsta_jela vj on j.tip=vj.id\n" +
        "where n.id_kupca=$1; ;", [id], function (err,result) {
      done();
      if(err){
        console.info(err);
        res.sendStatus(500);

      }
      else {


        res.render('narudzbe',{narudzbe:result.rows});

      }
    });
  });

});

router.get('/dostava', function(req, res, next) {
  if(req.user.tip!=2){
    res.sendStatus(404);
  }else {
    var id = req.user.id;


    pool.connect(function (err, client, done) {
      if (err) {
        res.end('{"error" : "Error", "status" : 500}');
      }
      client.query("select id_restorana from restoran_dostavljac where id_dostavljaca=$1 ;", [id], function (err, result) {
        done();
        if (err) {
          console.info(err);
          res.sendStatus(500);

        } else {

          req.id_r = result.rows;
          next();

        }
      });
    });
  }

}, function (req,res,next){
  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("select  n.id,k.id as id_kupca,k.ime, k.prezime,r.naziv as restoran,j.naziv as jelo,n.kolicina, n.kolicina*n.cijena as ukupna_cijena,n.nacin_placanja from narudzba n inner join jelo j on n.id_jela = j.id\n" +
        "inner join restoran r on n.id_restorana = r.id\n" +
        "inner join korisnici k on n.id_kupca = k.id\n" +
        "where n.id_dostavljaca=$1 and n.status='Nije isporuceno' ;", [req.user.id], function (err,result) {
      done();
      if(err){
        console.info(err);
        res.sendStatus(500);

      }
      else {
        console.info(result.rows)
        res.render('dostava',{dostava:result.rows});

      }
    });
  });
});

router.get('/isporucena/dostava/:id', function(req,res,next){
  var id=req.params.id;
  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("update narudzba set status='Isporucen' where id=$1 ;", [id], function (err,result) {
      done();
      if(err){
        console.info(err);
        res.sendStatus(500);

      }
      else {

        req.id_r=result.rows;
        res.redirect('/dostava');

      }
    });
  });
});

router.post('/pretrazi/jelo', function (req,res,next){
  req.ime=req.body.ime;

  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("select j.*, r.naziv as restoran_naziv from jelo j inner join restoran r on r.id=j.id_restorana where j.naziv =$1 ;", [req.ime], function (err,result) {
      done();
      if(err){
        console.info(err);
        res.sendStatus(500);

      }
      else {

        req.jela=result.rows;

        next();

      }
    });
  });

}, function (req,res,next){

  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("select a.*,j.naziv,j.status,j.id_restorana,j.cijena,j.slika,r.naziv as restoran_naziv  from akcija a inner join jelo j on j.id=a.id_jela  inner join restoran r on r.id=j.id_restorana where j.naziv =$1 ;", [req.ime], function (err,result) {
      done();
      if(err){
        console.info(err);
        res.sendStatus(500);

      }
      else {
        console.info(result.rows);
        req.akcija=result.rows;
        res.render('meni', { jela:req.jela, akcija:req.akcija });
      }
    });
  });
});

router.get('/svi/dostavljaci', function(req, res, next) {
  if(req.user.tip!=3){
    res.sendStatus(404);
  }else {
    var id = req.user.id;


    pool.connect(function (err, client, done) {
      if (err) {
        res.end('{"error" : "Error", "status" : 500}');
      }
      client.query("select id from restoran where id_administratora=$1 ;", [id], function (err, result) {
        done();
        if (err) {
          console.info(err);
          res.sendStatus(500);

        } else {

          req.id_r = result.rows[0].id;
          console.info(req.id_r)
          next();

        }
      });
    });
  }

}, function (req,res,next){
  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("select distinct(rd.id_dostavljaca),k.ime, k.prezime,k.email,k.br_tel from restoran_dostavljac rd inner join korisnici k on rd.id_dostavljaca = k.id\n" +
        "where rd.id_restorana<> $1;", [req.id_r], function (err,result) {
      done();
      if(err){
        console.info(err);
        res.sendStatus(500);

      }
      else {
        console.info(result.rows)
        res.render('dostavljaci',{dostavljac:result.rows, restoran:req.id_r});

      }
    });
  });
});

router.post('/zaposli/dostavljaca', function (req,res,next){
  var id_dostavljaca=req.body.id_dostavljaca;
  var id_restorana=req.body.id_restorana;
  console.info(id_dostavljaca);
  console.info(id_restorana);


  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("insert into restoran_dostavljac(id_restorana,id_dostavljaca) values($1,$2) ;", [id_restorana,id_dostavljaca], function (err,result) {
      done();
      if(err){
        console.info(err);
        res.sendStatus(500);

      }
      else {

        res.redirect('/users/administrator/restorana/pocetna/'+req.user.id)

      }
    });
  });


});

router.post('/lokacija/narudzbe',async function(req, res, next) {
  var id=req.body.id_kupca;
  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("select longitude, latitude from korisnici where id =$1 ;", [id], function (err,result) {
      done();
      if(err){
        console.info(err);
        res.sendStatus(500);

      }
      else {

        console.info(result.rows);
        res.render('prikazi_na_karti',{lokacija:result.rows})


      }
    });
  });


});


function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/restorani");
  }
  next();
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
}


module.exports = router;
