const bodyParser = require("body-parser");
const express = require("express");
const path = require("path");
const app = express();

const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");

async function openDb() {
    return sqlite.open({
        filename: "bd.sqlite",
        driver: sqlite3.Database,
    });
};

app.use(bodyParser.urlencoded({ extended: true }));

app.set('views', path.join(__dirname, 'views'));
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, 'public')));

app.get("/", async(req, res) => {
    const db = await openDb();
    const pagesize = 10
    const total = await db.all('select count(*) as total from alunos')
    const totalPages = total[0].total / pagesize
    if (req.query.page) {
        const offset = req.query.page * pagesize
        const page = parseInt(req.query.page)
        const emprestimos = await db.all(`select * from alunos inner join emprestimos on alunos.idAluno = emprestimos.id_aluno inner join livros on emprestimos.id_livro = livros.idLivro where estadoEmprestimo = 'ativo' order by emprestimos.data_entrega asc limit ${offset},  ${pagesize}`);
        res.render('HomePage', { emprestimos, page, totalPages })
    } else {
        const page = 0
        const emprestimos = await db.all(`select * from alunos inner join emprestimos on alunos.idAluno = emprestimos.id_aluno inner join livros on emprestimos.id_livro = livros.idLivro where estadoEmprestimo = 'ativo' order by emprestimos.data_entrega asc limit 0,  10`);
        res.render('HomePage', { emprestimos, page, totalPages })
    }
});

app.get("/cadastrar/aluno", (req, res) => {
    res.render("cadastrar/AlunoPage");
});

app.get("/cadastrar/livro", (req, res) => {
    res.render("cadastrar/LivroPage");
});

app.get("/livros/alugar/:id", async(req, res) => {
    const db = await openDb();
    const livros = await db.all('select * from livros where idLivro = ' + req.params.id);
    const alunos = await db.all('select * from alunos');
    res.render("AlugarPage", { livros, alunos });
});

app.post("/livros/alugar/:id", async(req, res) => {
    const { data_entrega, id_livro, id_aluno } = req.body;
    const db = await openDb();
    await db.run(
        `insert into emprestimos(data_entrega, estadoEmprestimo, id_aluno, id_livro) values ('${data_entrega}', 'ativo', '${id_aluno}', '${id_livro}')`
    );
    await db.run(
        `update livros set estadoLivro = 'indisponivel' where idLivro = ${id_livro}`
    );
    res.redirect("/");
});

app.get('/livros/delete/:id', async(req, res) => {
    const db = await openDb();
    await db.run(`delete from livros where idLivro = ${req.params.id}`);
    res.redirect('/livros');
});

app.get('/livros/delete/:id', async(req, res) => {
    const db = await openDb();
    await db.run(`delete from livros where idLivro = ${req.params.id}`);
    res.redirect('/livros');
});

app.get('/livros/editar/:id', async(req, res) => {
    const db = await openDb();
    const livro = await db.all(`select * from livros where idLivro = ${req.params.id}`)
    res.render('EditarPage', { livro });
})

app.post('/livros/editar/:id', async(req, res) => {
    const { titulo, autor, serieLivro, idLivro } = req.body
    const db = await openDb();
    await db.run(`update livros set titulo = '${titulo}', autor = '${autor}', estadoLivro = 'disponivel', serieLivro = '${serieLivro}' where idLivro = ${idLivro}`);
    res.redirect('/livros')
})

app.get('/devolver/:id', async(req, res) => {
    const db = await openDb();
    await db.run(`update livros set estadoLivro = 'disponivel' where idLivro = ${req.params.id}`);
    await db.run(`update emprestimos set estadoEmprestimo = 'inativo' where id_livro = ${req.params.id}`);
    res.redirect('/');
});

app.get("/livros", async(req, res) => {
    const db = await openDb();
    const livros = await db.all("select * from livros where estadoLivro = 'disponivel'");
    res.render("LivrosPage", { livros });
});

app.post("/cadastrar/aluno", async(req, res) => {
    const { nome, matricula, serie } = req.body;
    const db = await openDb();
    await db.run(
        `insert into alunos(nome, matricula, serieAluno) values ('${nome}', '${matricula}', '${serie}')`
    );
    res.redirect("/");
});

app.post("/cadastrar/livro", async(req, res) => {
    const { titulo, autor, serie } = req.body;
    const db = await openDb();
    await db.run(
        `insert into livros(titulo, autor, estadoLivro, serieLivro) values ('${titulo}', '${autor}', 'disponivel', '${serie}')`
    );
    res.redirect("/");
});

const init = async() => {
    const db = await openDb();
    await db.run(
        "create table if not exists alunos (idAluno INTEGER PRIMARY KEY, nome TEXT, matricula TEXT, serieAluno TEXT);"
    );
    await db.run(
        "create table if not exists livros (idLivro INTEGER PRIMARY KEY, titulo TEXT, autor TEXT, estadoLivro TEXT, serieLivro TEXT);"
    );
    await db.run(
        "create table if not exists emprestimos (idEmprestimo INTEGER PRIMARY KEY, data_entrega DATE, estadoEmprestimo TEXT, id_aluno INTEGER, id_livro INTEGER, FOREIGN KEY (id_aluno) REFERENCES alunos (idAluno), FOREIGN KEY (id_livro) REFERENCES livros (idLivro));"
    );
    await db.run(`insert into livros(idLivro, titulo, autor, estadoLivro, serieLivro) values ('1', 'teste', 'eu', 'disponivel', '3º ano E.M')`);
    await db.run(`insert into alunos(idAluno, nome, matricula, serieAluno) values ('1', 'matheus', '201610688', '3º ano E.M')`);
};
init();

const port = process.env.PORT || 3000;

app.listen(port, () => console.log("Loading..."));