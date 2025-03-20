INSERT INTO tipo_servicos (nome_servico, desc_servico, img_servico) VALUES
('Pintura', 'Serviço de pintura de paredes e superfícies', 'icon_pintura.png'),
('Reforma', 'Reformas e ajustes estruturais em imóveis', 'icon_reforma.png'),
('Elétrica', 'Instalação e manutenção de sistemas elétricos', 'icon_eletrica.png'),
('Hidráulica', 'Serviços de encanamento e reparos hidráulicos', 'icon_hidraulica.png'),
('Alvenaria', 'Construção e reparo com tijolos e concreto', 'icon_alvenaria.png'),
('Jardinagem', 'Serviços de jardinagem e paisagismo', 'icon_jardinagem.png'),
('Marcenaria', 'Serviços de construção e reparos em madeira', 'icon_marcenaria.png'),
('Gesso', 'Instalação de forros e acabamentos de gesso', 'icon_gesso.png'),
('Telhado', 'Instalação e reparo de telhados e coberturas', 'icon_telhado.png'),
('Instalações de Ar-Condicionado', 'Instalação e manutenção de ar-condicionado', 'icon_ar_condicionado.png'),
('Pisos e Revestimentos', 'Instalação e reparos de pisos e revestimentos', 'icon_pisos.png'),
('Limpeza Pós-Obra', 'Serviços de limpeza e remoção de resíduos após obras', 'icon_limpeza_obra.png'),
('Vidraçaria', 'Instalação e reparo de vidros e janelas', 'icon_vidraca.png'),
('Impermeabilização', 'Serviços de impermeabilização de superfícies', 'icon_impermeabilizacao.png'),
('Serralheria', 'Serviços de fabricação e reparo de estruturas metálicas', 'icon_serralheria.png'),
('Dedetização', 'Serviços de controle de pragas e dedetização', 'icon_dedetizacao.png'),
('Solda', 'Serviços de soldagem e reparos metálicos', 'icon_solda.png'),
('CFTV e Segurança', 'Instalação de câmeras de segurança e sistemas de vigilância', 'icon_cftv.png'),
('Encanamento de Gás', 'Instalação e manutenção de sistemas de gás', 'icon_encanamento_gas.png'),
('Construção de Piscinas', 'Construção e manutenção de piscinas', 'icon_piscinas.png'),
('Instalações de Energia Solar', 'Instalação de painéis solares e sistemas de energia solar', 'icon_energia_solar.png');


-- Inserção de CEPS da Zona Norte de São Paulo
INSERT INTO ceps (cep, latitude, longitude) VALUES
('05000-000', -23.533773, -46.731701), -- Lapa
('02900-000', -23.529189, -46.625973), -- Freguesia do Ó
('02922-000', -23.504743, -46.734552), -- Pirituba
('01152-000', -23.529142, -46.648917); -- Barra Funda

-- Inserção de Contratantes Ativos
INSERT INTO contratantes (nome, telefone, cpf, email, senha, cep, ativo) VALUES
('João Silva', '11987654321', '12345678901', 'joao.silva@gmail.com', 'senha123', '05000-000', 1),
('Maria Oliveira', '11976543210', '10987654321', 'maria.oliveira@hotmail.com', 'senha456', '02900-000', 1),
('Carlos Souza', '11876543210', '19876543210', 'carlos.souza@yahoo.com', 'senha789', '02922-000', 1),
('Fernanda Santos', '11975432123', '10765432109', 'fernanda.santos@gmail.com', 'senha012', '01152-000', 1),
('Ana Costa', '11873456789', '10234567890', 'ana.costa@outlook.com', 'senha345', '05000-000', 1),
('Ricardo Pereira', '11972345678', '10254367891', 'ricardo.pereira@live.com', 'senha678', '02900-000', 1),
('Juliana Lima', '11871234567', '10398765432', 'juliana.lima@gmail.com', 'senha901', '02922-000', 1),
('Paulo Barbosa', '11970123456', '10487654321', 'paulo.barbosa@terra.com.br', 'senha234', '01152-000', 1),
('Bruna Rocha', '11869012345', '10598765432', 'bruna.rocha@yahoo.com.br', 'senha567', '05000-000', 1),
('Eduardo Martins', '11968901234', '10609876543', 'eduardo.martins@icloud.com', 'senha890', '02900-000', 1),
('Vanessa Almeida', '11867890123', '10710987654', 'vanessa.almeida@hotmail.com', 'senha123', '02922-000', 1),
('Gustavo Costa', '11966789012', '10821098765', 'gustavo.costa@gmail.com', 'senha456', '01152-000', 1),
('Tatiane Lima', '11965678901', '10932109876', 'tatiane.lima@outlook.com', 'senha789', '05000-000', 1),
('Fabio Nunes', '11864567890', '11043210987', 'fabio.nunes@bol.com.br', 'senha012', '02900-000', 1),
('Raquel Dias', '11963456789', '11154321098', 'raquel.dias@yahoo.com', 'senha345', '02922-000', 1);

-- Pedreiros
INSERT INTO pedreiros (nome, telefone, cpf, email, senha, cep, ativo) VALUES
('José Almeida', '11962345678', '12309876543', 'jose.almeida@gmail.com', 'senha123', '05000-000', 1),
('Lucas Santos', '11961234567', '13456789012', 'lucas.santos@yahoo.com', 'senha456', '02900-000', 1);

-- Vincular pedreiros a serviços
INSERT INTO pedreiros_tipo_servicos (pedreiro_id, tipo_servico_id) VALUES
(1, 1),  -- José Almeida faz Pintura
(1, 2),  -- José Almeida faz Elétrica
(2, 1);  -- Lucas Santos faz Pintura

-- Contratantes
INSERT INTO contratantes (nome, telefone, cpf, email, senha, cep, ativo) VALUES
('Ana Oliveira', '11987654321', '11122233344', 'ana.oliveira@gmail.com', 'senha123', '05000-000', 1);

-- Serviços Postados
INSERT INTO servicos_postados (descricao, cep_obra, contratante_id, pedreiro_id, tipo_servico_id, prazo, valor, status) VALUES
('Pintura de sala e quarto', '05000-000', 1, 1, 1, '7 dias', 'R$ 1.200,00', 'pendente'),
('Instalação de fiação elétrica', '02900-000', 1, NULL, 2, '5 dias', 'R$ 900,00', 'pendente');
