CREATE DATABASE IF NOT EXISTS tienda_api;
USE tienda_api;

CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    descripcion TEXT
);

INSERT INTO productos (nombre, precio, descripcion) VALUES ('Monitor', 200.00, 'Pantalla LED 24 pulgadas');
