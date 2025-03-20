-- Criação do Banco de Dados
CREATE DATABASE IF NOT EXISTS Em_Obra;
 
-- Usar o Banco de Dados
USE Em_Obra;
 
-- Criação da Tabela ceps (armazena CEPs com coordenadas)
CREATE TABLE ceps (
    cep VARCHAR(9) PRIMARY KEY, 
    latitude DECIMAL(10, 8) NOT NULL, 
    longitude DECIMAL(11, 8) NOT NULL, 
    INDEX (latitude),
    INDEX (longitude)
);
 
-- Criação da Tabela tipo_servicos
CREATE TABLE tipo_servicos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_servico VARCHAR(100) NOT NULL,
    desc_servico VARCHAR(255) NOT NULL,
    img_servico VARCHAR(255)
);
 
-- Criação da Tabela contratantes
CREATE TABLE contratantes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(15),
    cpf VARCHAR(14) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    img_perfil VARCHAR(255) DEFAULT 'avatar_contratante.jpg',
    cep VARCHAR(9) NOT NULL,
    ativo TINYINT(1) DEFAULT 0,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cep) REFERENCES ceps(cep),
    INDEX (cpf),
    INDEX (email),
    INDEX (cep)
);
 
-- Criação da Tabela pedreiros
CREATE TABLE pedreiros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(15),
    cpf VARCHAR(14) NOT NULL UNIQUE,
    cep VARCHAR(9) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    img_perfil VARCHAR(255) DEFAULT 'avatar_pedreiro.jpg',
    premium TINYINT(1) DEFAULT 0,
    ativo TINYINT(1) DEFAULT 0,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cep) REFERENCES ceps(cep),
    INDEX (cep) 
);
 
-- Criação da Tabela de Junção pedreiros_tipo_servicos
CREATE TABLE pedreiros_tipo_servicos (
    pedreiro_id INT NOT NULL,
    tipo_servico_id INT NOT NULL,
    PRIMARY KEY (pedreiro_id, tipo_servico_id),
    FOREIGN KEY (pedreiro_id) REFERENCES pedreiros(id) ON DELETE CASCADE,
    FOREIGN KEY (tipo_servico_id) REFERENCES tipo_servicos(id) ON DELETE CASCADE,
    CONSTRAINT unique_pedreiro_servico UNIQUE (pedreiro_id, tipo_servico_id)
);
 
-- Criação da Tabela parceiros
CREATE TABLE parceiros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    imagem VARCHAR(255),
    contato VARCHAR(50),
    endereco VARCHAR(255),
    tipo_parceiro VARCHAR(20),
    url VARCHAR(255)
);
 
-- Criação da Tabela servicos_postados
CREATE TABLE servicos_postados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    descricao TEXT NOT NULL,
    cep_obra VARCHAR(9) NOT NULL,
    contratante_id INT NOT NULL,
    pedreiro_id INT,
    tipo_servico_id INT,
    prazo VARCHAR(30),
    valor VARCHAR(20),
    status ENUM('pendente', 'aceito','aguardando confirmacao', 'finalizado') DEFAULT 'pendente',
    data_postagem TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_finalizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contratante_id) REFERENCES contratantes(id) ON DELETE CASCADE,
    FOREIGN KEY (pedreiro_id) REFERENCES pedreiros(id) ON DELETE SET NULL,
    FOREIGN KEY (tipo_servico_id) REFERENCES tipo_servicos(id) ON DELETE SET NULL,
    FOREIGN KEY (cep_obra) REFERENCES ceps(cep)
);
 
-- Criação da Tabela historico_servicos
CREATE TABLE historico_servicos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    servico_id INT NOT NULL,
    contratante_id INT NOT NULL,
    pedreiro_id INT,
    tipo_servico_id INT NOT NULL,
    data_inicio DATE,
    data_fim DATE,
    status ENUM('finalizado') NOT NULL,
    FOREIGN KEY (contratante_id) REFERENCES contratantes(id) ON DELETE CASCADE,
    FOREIGN KEY (pedreiro_id) REFERENCES pedreiros(id) ON DELETE SET NULL,
    FOREIGN KEY (servico_id) REFERENCES servicos_postados(id) ON DELETE CASCADE,
    FOREIGN KEY (tipo_servico_id) REFERENCES tipo_servicos(id) ON DELETE CASCADE
);
 
-- Criação da Tabela avaliacoes
CREATE TABLE avaliacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contratante_id INT NOT NULL,
    pedreiro_id INT NOT NULL,
    nota TINYINT NOT NULL CHECK (nota BETWEEN 1 AND 5),
    comentario TEXT,
    data_avaliacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contratante_id) REFERENCES contratantes(id) ON DELETE CASCADE,
    FOREIGN KEY (pedreiro_id) REFERENCES pedreiros(id) ON DELETE CASCADE
);

-- Criação da Tabela codigos_redefinicao
CREATE TABLE codigos_redefinicao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo INT NOT NULL,
    expiracao BIGINT NOT NULL,
    tipo_usuario ENUM('pedreiro', 'contratante') NOT NULL,
    usuario_id INT NOT NULL,
    CONSTRAINT fk_usuario_id_pedreiros
        FOREIGN KEY (usuario_id)
        REFERENCES pedreiros(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_usuario_id_contratantes
        FOREIGN KEY (usuario_id)
        REFERENCES contratantes(id)
        ON DELETE CASCADE
);


