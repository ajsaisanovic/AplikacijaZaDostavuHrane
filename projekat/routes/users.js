var express = require('express');
var router = express.Router();
var nodemailer = require('nodemailer');

const bcrypt = require('bcrypt');
const saltRounds = 10;
const myPlaintextPassword = 's0/\/\P4$$w0rD';
const someOtherPlaintextPassword = 'not_bacon';

var bodyParser=require('body-parser')
var fileUpload=require('express-fileupload')
var path=require('path')

const handleError = (err, res) => {
  res
      .status(500)
      .contentType("text/plain")
      .end("Oops! Something went wrong!");
};

var pg=require('pg');

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


router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/administrator/glavni',db.getRestorani,db.getVrstaJela, function(req, res, next) {
  if(req.user.tip!=4){
    res.sendStatus(404);
  }else {
    res.render('glavni_ad', {restorani: req.restorani, vrsta_jela: req.vrsta_jela});
  }
});

router.post('/dodaj/restoran', function(req, res, next) {
  req.naziv=req.body.ime;
  req.adresa=req.body.adresa;
  req.grad=req.body.grad;
  req.br_z=req.body.br_z;
  req.kategorija=req.body.kat;
  req.dostava=req.body.dostava;
  //req.slika=req.body.slika;
  var korisnik=req.body.ime_ad;
  var prezime=req.body.prezime;
  req.email=req.body.email;
  var pass=req.body.pass;
  var adresa_ad=req.body.adresa_ad;
  var broj=req.body.br;
  //console.info(korisnik, prezime,req.email, pass, adresa_ad,broj);
  if(!req.files){
    res.send("No file uploaded");
  }
  else {
    var file =req.files.file;
    req.slikafajla=file.name;
    var extension=path.extname(file.name);
    if(extension !== ".png" && extension !==".gif" && extension!==".jpg"){
      res.send("only images are allowed");

    }
    file.mv(__dirname+"/../public/images/"+file.name,function (err){
      if(err)
      {
        res.status(500).send(err);
      }  else {
        bcrypt.genSalt(saltRounds, function(err, salt) {
          bcrypt.hash(pass, salt, function(err, hash) {
            pool.connect(function (err,client,done) {
              if(err){
                res.end('{"error" : "Error", "status" : 500}');
              }
              client.query("insert into Korisnici (ime,prezime,email,pasvord,br_tel,tip) values ($1,$2,$3,$4,$5,3);", [korisnik,prezime,req.email,hash,broj], function (err,result) {
                done();
                if(err){
                  console.info(err);
                  res.sendStatus(500);

                }
                else {

                  next();
                }
              });
            });
          });
        });
      }
    });
  }


}, function (req,res,next){
  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("select id from Korisnici where email=$1",
        [req.email], function (err,result) {

          done();
          if(err){
            console.info(err);
            res.sendStatus(500);

          }
          else {

            req.id=result.rows;
            console.info(req.id);
            next();
          }
        });
  });
},function (req,res,next){
  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("insert into restoran(naziv,adresa,grad,br_zvjezdica,kategorija,udaljenost_dostave,slika,id_administratora) values($1,$2,$3,$4,$5,$6,$7,$8)",
        [req.naziv, req.adresa,req.grad,req.br_z,req.kategorija,req.dostava,req.slikafajla,req.id[0].id], function (err,result) {

          done();
          if(err){
            console.info(err);
            res.sendStatus(500);

          }
          else {

            res.redirect('/users/administrator/glavni');

          }
        });
  });
});

router.post('/dodaj/jelo/:k', function(req, res, next) {
  req.id = req.params.k;
  req.naziv = req.body.ime_jela;
  req.vrsta = req.body.vrsta;
  req.cijena = req.body.cijena;
  req.restoran = req.body.restoran;
  req.grupni_meni=req.body.grupni_meni;

  if (!req.files) {
    res.send("No file uploaded");
  } else {
    var file = req.files.file;
    req.slika=file.name;
    var extension = path.extname(file.name);
    if (extension !== ".png" && extension !== ".gif" && extension !== ".jpg") {
      res.send("only images are allowed");

    }
    file.mv(__dirname + "/../public/images/" + file.name, function (err) {
      if (err) {
        res.status(500).send(err);
      } else {
        next();
      }
    });
  }



},function (req,res,next){
  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("insert into jelo(naziv,slika,tip,cijena,id_restorana,grupni_meni) values($1,$2,$3,$4,$5,$6)",
        [req.naziv,req.slika,req.vrsta,req.cijena,req.restoran,req.grupni_meni], function (err,result) {
          done();
          if(err){
            console.info(err);
            res.sendStatus(500);
          }
          else {

            res.redirect('/users/administrator/restorana/pocetna/'+req.id);

          }
        });
  });
});

router.post('/dodaj/akciju/:k', function(req, res, next) {
  req.id_jela=req.body.vrsta;
  let cijena=req.body.cijena;
  var datum=req.body.trajanje;
  req.id=req.params.k;
  //console.info(id_jela,cijena,datum,id);


  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("insert into akcija(id_jela, datum_trajanja, a_cijena) values($1,$2,$3)",
        [req.id_jela,datum,cijena], function (err,result) {
          done();
          if(err){
            console.info(err);
            res.sendStatus(500);
          }
          else {
            next();
          }
        });
  });
},function(req,res,next){
  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("update jelo set akcija_status='aktivan' where id=$1" ,
        [req.id_jela], function (err,result) {
          done();
          if(err){
            console.info(err);
            res.sendStatus(500);
          }
          else {
            res.redirect('/users/administrator/restorana/pocetna/'+req.id);
          }
        });
  });
});

router.post('/dodaj/vrstu/jela', function(req, res, next) {
  var naziv=req.body.vrsta;

  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("insert into vrsta_jela(naziv) values($1)",
        [naziv], function (err,result) {
          done();
          if(err){
            console.info(err);
            res.sendStatus(500);
          }
          else {
            res.redirect('/users/administrator/glavni');
          }
        });
  });
});


router.get('/administrator/restorani', function(req, res, next) {
  if(req.user.tip!=4){
    res.sendStatus(404);
  }else {
    pool.connect(function (err, client, done) {
      if (err) {
        res.end('{"error" : "Error", "status" : 500}');
      }
      client.query("select * from restoran ;", [], function (err, result) {
        done();
        if (err) {
          console.info(err);
          res.sendStatus(500);

        } else {

          //console.info(result.rows);
          res.render('restorani_administrator', {restorani: result.rows});
        }
      });
    });
  }
});

router.get('/administrator/restorana/pocetna/:k', db.getVrstaJela,function(req, res, next) {
  if(req.user.tip<3){
    res.sendStatus(404);
  } else {
    let id = req.params.k;
    console.info(id);
    pool.connect(function (err, client, done) {
      if (err) {
        res.end('{"error" : "Error", "status" : 500}');
      }
      client.query("select * from restoran where id_administratora=$1 ;", [id], function (err, result) {
        done();
        if (err) {
          console.info(err);
          res.sendStatus(500);

        } else {

          req.restorani = result.rows;
          next();
        }
      });
    });
  }

},function(req,res,next) {
    pool.connect(function (err, client, done) {
      if (err) {
        res.end('{"error" : "Error", "status" : 500}');
      }
      client.query("select * from jelo where id_restorana=$1 ;", [req.restorani[0].id], function (err, result) {
        done();
        if (err) {
          console.info(err);
          res.sendStatus(500);

        } else {
          req.jela = result.rows;
          // console.info(req.jela);
          console.info(req.restorani);
          res.render('pocetna_administrator_restorana', {
            restorani: req.restorani,
            vrsta_jela: req.vrsta_jela,
            jela: req.jela
          });
        }
      });
    });

});


router.get('/administrator/restorana/:k', function(req, res, next) {
  let id=req.params.k;
  console.info(id);
  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("select * from restoran where id=$1 ;", [id], function (err,result) {
      done();
      if(err){
        console.info(err);
        res.sendStatus(500);

      }
      else {

        console.info(result.rows);
        res.render('restorani_administrator', { restorani:result.rows });
      }
    });
  });

});


router.get('/obrisi/restoran/:id', function(req, res, next) {
  var id=req.params.id;
  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("update  restoran set status='neaktivan' where id=$1;", [id], function (err,result) {
      done();
      if(err){
        console.info(err);
        res.sendStatus(500);

      }
      else {
          req.id=id;
          next();
      }
    });
  });

}, function(req,res,next){
  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("update  jelo set status='neaktivan' where id_restorana=$1;", [req.id], function (err,result) {
      done();
      if(err){
        console.info(err);
        res.sendStatus(500);
      }
      else {
        res.redirect('/users/administrator/restorani');
      }
    });
  });
});

router.get('/administrator/meni/:k', function(req, res, next) {
  if(req.user.tip<3){
    res.sendStatus(404);
  }else {
    restoran = req.params.k;

    pool.connect(function (err, client, done) {
      if (err) {
        res.end('{"error" : "Error", "status" : 500}');
      }
      client.query("select * from jelo where id_restorana=$1 ;", [restoran], function (err, result) {
        done();
        if (err) {
          console.info(err);
          res.sendStatus(500);

        } else {
          req.jela = result.rows;
          req.restoran = restoran;
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
    client.query("select a.*,j.naziv,j.status,j.id_restorana,j.cijena,j.slika from akcija a inner join jelo j on j.id=a.id_jela where j.id_restorana=$1 ;", [req.restoran], function (err,result) {
      done();
      if(err){
        console.info(err);
        res.sendStatus(500);

      }
      else {
        console.info(result.rows);
        req.akcija=result.rows;
        res.render('jela_administrator', { jela:req.jela, akcija:req.akcija,restoran:req.restoran });
      }
    });
  });
});

router.post('/akciju/obrisi', function(req, res, next) {
  var id=req.body.id;
  req.restoran=req.body.restoran;
  req.jelo=req.body.jelo;
  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("update  akcija set status_a='neaktivan' where id=$1;", [id], function (err,result) {
      done();
      if(err){
        console.info(err);
        res.sendStatus(500);

      }
      else {

        next();
      }
    });
  });


},function (req,res,next){
  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("update  jelo set akcija_status='neaktivan' where id=$1;", [req.jelo], function (err,result) {
      done();
      if(err){
        console.info(err);
        res.sendStatus(500);

      }
      else {

        res.redirect('/users/administrator/meni/'+req.restoran)
      }
    });
  });
});

router.post('/jelo/obrisi', function(req, res, next) {
  var id=req.body.id;
  var restoran=req.body.restoran;
  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("update  jelo set status='neaktivan' where id=$1;", [id], function (err,result) {
      done();
      if(err){
        console.info(err);
        res.sendStatus(500);

      }
      else {
        req.id=id;
        req.restoran=restoran;
        next();
        //res.redirect('/users/administrator/meni/'+restoran)
      }
    });
  });


},function (req,res,next){
  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("update  akcija set status_a='neaktivan' where id_jela=$1;", [req.id], function (err,result) {
      done();
      if(err){
        console.info(err);
        res.sendStatus(500);

      }
      else {

        res.redirect('/users/administrator/meni/'+req.restoran)
      }
    });
  });
});


router.post('/narudzba', function(req, res, next) {
  let kolicina=req.body.kolicina;
  let id_jela=req.body.id_jela;
  let id_restorana=req.body.id_restorana;
  let vrijeme=req.body.vrijeme;
  let cijena=req.body.cijena;
  let vrijeme_dostave=req.body.vrijeme_dostave;
  console.info(vrijeme_dostave);
  var placanje=req.body.placanje;
  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'dostava.projekat@gmail.com',
      pass: 'dostavaprojekat2021'
    }
  });

  var mailOptions = {
    from: 'dostava.projekat@gmail.com',
    to: req.user.email,
    subject: 'DOSTAVA',
    text: 'Uspjesno ste narucili!'
  };

  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });


  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("insert into narudzba(id_jela,id_kupca,kolicina,id_restorana,vrijeme,datum,cijena,nacin_placanja) values($1,$2,$3,$4,$5,current_date,$6,$7)",
        [id_jela,req.user.id,kolicina,id_restorana,vrijeme,cijena,placanje], function (err,result) {
          done();
          if(err){
            console.info(err);
            res.sendStatus(500);
          }
          else {
            res.redirect('/restorani/meni/'+id_restorana);
          }
        });
  });



});

router.get("/upload",function (req,res,next){
  res.render('upload');
});

router.post("/upload",function (req,res,next){
  if(!req.files){
    res.send("No file uploaded");
  }
  else {
    var file =req.files.file;
    var extension=path.extname(file.name);
    if(extension !== ".png" && extension !==".gif" && extension!==".jpg"){
      res.send("only images are allowed");

    }
    file.mv(__dirname+"/../public/images/"+file.name,function (err){
      if(err)
      {
        res.status(500).send(err);
      }  else {
        res.send("uspjeli");
      }
    });
  }
});

router.get('/uredi/jelo/:id/:restoran',db.getVrstaJela, function (req,res,next){
  if(req.user.tip<3){
    res.sendStatus(404);
  }else {
    var id = req.params.id;
    var restoran = req.params.restoran;
    console.info(id, restoran);

    pool.connect(function (err, client, done) {
      if (err) {
        res.end('{"error" : "Error", "status" : 500}');
      }
      client.query("select j.*, vj.id as id_tip from jelo j inner join vrsta_jela vj on vj.id=j.tip where j.id=$1 ;", [id], function (err, result) {
        done();
        if (err) {
          console.info(err);
          res.sendStatus(500);

        } else {
          res.render('uredi_jelo', {jelo: result.rows, restoran: restoran, vrsta_jela: req.vrsta_jela});
        }
      });
    });
  }
});

router.post('/uredi/jelo', function (req,res,next){
  req.ime=req.body.ime_jela;
  req.vrsta=req.body.vrsta;
  req.cijena=req.body.cijena;
  req.id=req.body.id;
  req.id_restorana=req.body.id_restorana
  console.info(req.body.slika);

  if(!req.files){
    req.ime_slike=req.body.slika;
    next();
  }
  else {
    var file =req.files.file;
    var extension=path.extname(file.name);
    req.ime_slike=file.name;
    if(extension !== ".png" && extension !==".gif" && extension!==".jpg"){
      res.send("only images are allowed");

    }
    file.mv(__dirname+"/../public/images/"+file.name,function (err){
      if(err)
      {
        res.status(500).send(err);
      }  else {
        next();
      }
    });
  }


},function (req,res,next){
  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("update jelo set naziv=$2,cijena=$3,tip=$4, slika=$5 where id=$1 ;", [req.id,req.ime,req.cijena,req.vrsta,req.ime_slike], function (err,result) {
      done();
      if(err){
        console.info(err);
        res.sendStatus(500);

      }
      else {
        res.redirect('/users/administrator/meni/'+req.id_restorana);
      }
    });
  });
});

router.get('/uredi/akciju/:id/:restoran', function (req,res,next){
  if(req.user.tip<3){
    res.sendStatus(404);
  }else {
    var id = req.params.id;
    var restoran = req.params.restoran;
    console.info(id, restoran);


    pool.connect(function (err, client, done) {
      if (err) {
        res.end('{"error" : "Error", "status" : 500}');
      }
      client.query("select * from akcija where id=$1 ;", [id], function (err, result) {
        done();
        if (err) {
          console.info(err);
          res.sendStatus(500);

        } else {
          res.render('uredi_akciju', {akcija: result.rows, restoran: restoran});
        }
      });
    });
  }
});

router.post('/uredi/akciju', function (req,res,next){

  var cijena=req.body.cijena;
  var datum=req.body.datum;
  var id=req.body.id;
  var id_restorana=req.body.id_restorana;

  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("update akcija set a_cijena=$1, datum_trajanja=$2 where id=$3 ;", [cijena, datum,id], function (err,result) {
      done();
      if(err){
        console.info(err);
        res.sendStatus(500);

      }
      else {
        res.redirect('/users/administrator/meni/'+id_restorana);
      }
    });
  });

});

router.get('/uredi/restoran/:id', function (req,res,next){
  if(req.user.tip!=4){
    res.sendStatus(404);
  }else {

    var id = req.params.id;


    pool.connect(function (err, client, done) {
      if (err) {
        res.end('{"error" : "Error", "status" : 500}');
      }
      client.query("select * from restoran where id=$1 ;", [id], function (err, result) {
        done();
        if (err) {
          console.info(err);
          res.sendStatus(500);

        } else {

          res.render('uredi_restoran', {restoran: result.rows});
        }
      });
    });
  }
});

router.post('/uredi/restoran', function (req,res,next){
  req.ime=req.body.ime;
  req.adresa=req.body.adresa;
  req.grad=req.body.grad;
  req.id=req.body.id;
  req.br_z=req.body.br_z;
  req.kategorija=req.body.kat;
  req.dostava=req.body.dostava;
  console.info(req.id);

  if(!req.files){
    req.ime_slike=req.body.slika;
    next();
  }
  else {
    var file =req.files.file;
    var extension=path.extname(file.name);
    req.ime_slike=file.name;
    if(extension !== ".png" && extension !==".gif" && extension!==".jpg"){
      res.send("only images are allowed");

    }
    file.mv(__dirname+"/../public/images/"+file.name,function (err){
      if(err)
      {
        res.status(500).send(err);
      }  else {
        next();
      }
    });
  }


},function (req,res,next){
  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("update restoran set naziv=$2,adresa=$3,grad=$4, slika=$5, kategorija=$6, udaljenost_dostave=$7,br_zvjezdica=$8 where id=$1 ;", [req.id,req.ime,req.adresa,req.grad,req.ime_slike,req.kategorija,req.dostava,req.br_z], function (err,result) {
      done();
      if(err){
        console.info(err);
        res.sendStatus(500);

      }
      else {
        res.redirect('/users/administrator/restorani');
      }
    });
  });
});

router.post('/dostavljac/racun', function(req, res, next) {
  req.ime=req.body.ime;
  req.prezime=req.body.prezime;
  req.email=req.body.email;
  req.pasvord=req.body.pass;
  req.adresa=req.body.adresa;
  req.broj=req.body.br;
  req.id_res=req.body.id_res;
  req.id_ad=req.body.id_ad;

  bcrypt.genSalt(saltRounds, function(err, salt) {
    bcrypt.hash(req.pasvord, salt, function(err, hash) {
      pool.connect(function (err,client,done) {
        if(err){
          res.end('{"error" : "Error", "status" : 500}');
        }
        client.query("insert into korisnici (ime,prezime,email,pasvord,br_tel,tip) values ($1,$2,$3,$4,$5,2);", [req.ime,req.prezime,req.email,hash,req.broj], function (err,result) {
          done();
          if(err){
            console.info(err);
            res.sendStatus(500);

          }
          else {

            next();
          }
        });
      });
    });
  });


}, function (req,res,next){
  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("select id from korisnici where email=$1",
        [req.email], function (err,result) {

          done();
          if(err){
            console.info(err);
            res.sendStatus(500);

          }
          else {

            req.id=result.rows;
            console.info(req.id);
            next();
          }
        });
  });
}, function (req,res,next){

  console.info(req.id_restorana);
  pool.connect(function (err,client,done) {
    if(err){
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("insert into restoran_dostavljac(id_restorana,id_dostavljaca) values($1,$2)",
        [req.id_res,req.id[0].id], function (err,result) {

          done();
          if(err){
            console.info(err);
            res.sendStatus(500);

          }
          else {

            res.redirect('/users/administrator/restorana/pocetna/'+req.id_ad);

          }
        });
  });
});

router.get('/dosadasnje/narudzbe/:k', function (req,res,next){
  if(req.user.tip<3){
    res.sendStatus(404);
  }else {
    var id = req.params.k;

    pool.connect(function (err, client, done) {
      if (err) {
        res.end('{"error" : "Error", "status" : 500}');
      }
      client.query("select n.status as isporuceno,n.odobrena, n.id,k.ime, k.prezime,r.naziv as restoran,j.naziv as jelo,n.kolicina, n.kolicina*n.cijena as ukupna_cijena from narudzba n inner join jelo j on n.id_jela = j.id\n" +
          "inner join restoran r on n.id_restorana = r.id\n" +
          "inner join korisnici k on n.id_kupca = k.id\n" +
          "where n.id_restorana=$1 and n.odobrena=1;", [id], function (err, result) {
        done();
        if (err) {
          console.info(err);
          res.sendStatus(500);

        } else {
          console.info(result.rows);
          res.render('sve_narudzbe', {dostava: result.rows});

        }
      });
    });
  }
});

router.get('/odobri/narudzbe/:k', function (req,res,next){
  if(req.user.tip<3){
    res.sendStatus(404);
  }else {
    req.id = req.params.k;

    pool.connect(function (err, client, done) {
      if (err) {
        res.end('{"error" : "Error", "status" : 500}');
      }
      client.query("select  n.id,k.ime,n.id_restorana, k.prezime,r.naziv as restoran,j.naziv as jelo,n.kolicina, n.kolicina*n.cijena as ukupna_cijena from narudzba n inner join jelo j on n.id_jela = j.id\n" +
          "inner join restoran r on n.id_restorana = r.id\n" +
          "inner join korisnici k on n.id_kupca = k.id\n" +
          "where n.id_restorana=$1 and n.odobrena=0 ;", [req.id], function (err, result) {
        done();
        if (err) {
          console.info(err);
          res.sendStatus(500);

        } else {

          req.narudzbe=result.rows;
          console.info(result.rows);
          next();


        }
      });
    });
  }
},function(req,res,next){
  pool.connect(function (err, client, done) {
    if (err) {
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("select rd.id_dostavljaca,concat(k.ime ,' ',k.prezime),count(*) as broj from restoran_dostavljac rd inner join korisnici k on k.id = rd.id_dostavljaca\n" +
        "left join narudzba n on rd.id_dostavljaca = n.id_dostavljaca where rd.id_restorana=$1\n" +
        "group by rd.id_dostavljaca, k.ime, k.prezime order by broj asc;", [req.id], function (err, result) {
      done();
      if (err) {
        console.info(err);
        res.sendStatus(500);

      } else {
        console.info(result.rows);

        res.render('odobri_narudzbe', {dostava: req.narudzbe,dostavljac:result.rows});

      }
    });
  });
});

router.post('/odobreno', function (req,res,next){
  if(req.user.tip<3){
    res.sendStatus(404);
  }else {
    req.id = req.body.id;
    req.restoran=req.body.id_restorana;
    req.id_dostavljaca=req.body.dostavljac;

    pool.connect(function (err, client, done) {
      if (err) {
        res.end('{"error" : "Error", "status" : 500}');
      }
      client.query("update narudzba set odobrena=1 where id=$1;", [req.id], function (err, result) {
        done();
        if (err) {
          console.info(err);
          res.sendStatus(500);

        } else {
          console.info(result.rows);
          next();

        }
      });
    });
  }
},function (req,res,next){
  pool.connect(function (err, client, done) {
    if (err) {
      res.end('{"error" : "Error", "status" : 500}');
    }
    client.query("update narudzba set id_dostavljaca=$2 where id=$1;", [req.id,req.id_dostavljaca], function (err, result) {
      done();
      if (err) {
        console.info(err);
        res.sendStatus(500);

      } else {

        res.redirect('/users/odobri/narudzbe/'+req.restoran);

      }
    });
  });
});

module.exports = router;
