const http = require('http');
const url = require('url');
const fs = require('fs');
const mysql = require('mysql2');

// --- 1. CONFIGURACIÓN BASE DE DATOS ---
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',      // Cambia esto por tu usuario
    password: '0526',      // Cambia esto por tu contraseña
    database: 'tienda_api'
});

db.connect(err => {
    if (err) throw 'Error conectando a BDD: ' + err.stack;
    console.log('Conectado a MySQL con ID: ' + db.threadId);
});

// --- 2. FUNCIÓN PARA REGISTRAR LOGS ---
const logRequest = (method, path) => {
    const logEntry = `${new Date().toISOString()} - Método: ${method} - Ruta: ${path}\n`;
    
    // Usamos fs.appendFile para añadir el log al final del archivo sin borrar lo anterior
    fs.appendFile('server.log', logEntry, (err) => {
        if (err) console.error('Error escribiendo log:', err);
    });
};

// --- 3. HELPER PARA LEER EL BODY (POST/PUT) ---
// Como no usamos Express, debemos leer el stream de datos manualmente
const getBodyData = (req) => {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                // Si viene vacío, retornamos objeto vacío, si no, parseamos JSON
                resolve(body ? JSON.parse(body) : {});
            } catch (error) {
                reject(error);
            }
        });
    });
};

// --- 4. CREACIÓN DEL SERVIDOR ---
const server = http.createServer(async (req, res) => {
    // Parsear la URL para obtener query params (?id=1) y pathname
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const method = req.method;
    const query = parsedUrl.query;

    // Configurar cabeceras de respuesta (JSON)
    res.setHeader('Content-Type', 'application/json');

    // Registrar Log
    logRequest(method, req.url);

    // --- ENRUTAMIENTO MANUAL ---

    // RUTA: /productos
    if (path === '/productos') {
        
        // A) OBTENER TODOS O UNO ESPECÍFICO (GET)
        if (method === 'GET') {
            if (query.id) {
                // Obtener producto específico (/productos?id=X)
                db.query('SELECT * FROM productos WHERE id = ?', [query.id], (err, results) => {
                    if (err) {
                        res.statusCode = 500;
                        return res.end(JSON.stringify({ error: err.message }));
                    }
                    if (results.length === 0) {
                        res.statusCode = 404;
                        return res.end(JSON.stringify({ error: 'Producto no encontrado' }));
                    }
                    res.statusCode = 200;
                    res.end(JSON.stringify(results[0]));
                });
            } else {
                // Obtener todos los productos
                db.query('SELECT * FROM productos', (err, results) => {
                    if (err) {
                        res.statusCode = 500;
                        return res.end(JSON.stringify({ error: err.message }));
                    }
                    res.statusCode = 200;
                    res.end(JSON.stringify(results));
                });
            }
        }

        // B) CREAR PRODUCTO (POST)
        else if (method === 'POST') {
            try {
                const data = await getBodyData(req);
                const { nombre, precio, descripcion } = data;

                if (!nombre || !precio) {
                    res.statusCode = 400;
                    return res.end(JSON.stringify({ error: 'Nombre y precio son obligatorios' }));
                }

                const querySql = 'INSERT INTO productos (nombre, precio, descripcion) VALUES (?, ?, ?)';
                db.query(querySql, [nombre, precio, descripcion], (err, result) => {
                    if (err) {
                        res.statusCode = 500;
                        return res.end(JSON.stringify({ error: err.message }));
                    }
                    res.statusCode = 201;
                    res.end(JSON.stringify({ message: 'Producto creado', id: result.insertId }));
                });
            } catch (e) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'JSON inválido' }));
            }
        }

        // C) ACTUALIZAR PRODUCTO (PUT) - Requiere ?id=X
        else if (method === 'PUT') {
            if (!query.id) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'Debes proporcionar un ID en la URL (?id=X)' }));
            }
            try {
                const data = await getBodyData(req);
                const { nombre, precio, descripcion } = data;

                const querySql = 'UPDATE productos SET nombre = ?, precio = ?, descripcion = ? WHERE id = ?';
                db.query(querySql, [nombre, precio, descripcion, query.id], (err, result) => {
                    if (err) {
                        res.statusCode = 500;
                        return res.end(JSON.stringify({ error: err.message }));
                    }
                    if (result.affectedRows === 0) {
                        res.statusCode = 404;
                        return res.end(JSON.stringify({ error: 'Producto no encontrado para actualizar' }));
                    }
                    res.statusCode = 200;
                    res.end(JSON.stringify({ message: 'Producto actualizado exitosamente' }));
                });
            } catch (e) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'JSON inválido' }));
            }
        }

        // D) ELIMINAR PRODUCTO (DELETE) - Requiere ?id=X
        else if (method === 'DELETE') {
            if (!query.id) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'Debes proporcionar un ID en la URL (?id=X)' }));
            }

            db.query('DELETE FROM productos WHERE id = ?', [query.id], (err, result) => {
                if (err) {
                    res.statusCode = 500;
                    return res.end(JSON.stringify({ error: err.message }));
                }
                if (result.affectedRows === 0) {
                    res.statusCode = 404;
                    return res.end(JSON.stringify({ error: 'Producto no encontrado para eliminar' }));
                }
                res.statusCode = 200;
                res.end(JSON.stringify({ message: 'Producto eliminado' }));
            });
        } 
        
        // Método no permitido en /productos
        else {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Método no permitido' }));
        }

    } 
    // RUTA NO ENCONTRADA (404 GENÉRICO)
    else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Ruta no encontrada (404)' }));
    }
});

// Iniciar servidor
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});