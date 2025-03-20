const getCoordinatesFromCep = require('../utils/getCoordinatesFromCep');
const database = require('../database/connection');
const dotenv = require('dotenv');
dotenv.config();

class perfilContratante {

    //Listar um contratante
    async listarContratante(request, response) {
        const { id } = request.params;

        if (!id) {
            return response.status(400).json({ mensagem: 'ID do pedreiro é necessário' });
        }

        try {
            // Consulta os dados do contratante
            const contratante = await database.select('contratantes.id', 'contratantes.nome', 'contratantes.telefone', 'contratantes.cpf', 'contratantes.cep', 'contratantes.email', 'contratantes.img_perfil').from('contratantes').where('contratantes.id', id);

            // Verifica se o contratante foi encontrado
            if (contratante.length === 0) {
                return response.status(404).json({ mensagem: 'Contratante não encontrado' });
            }

            const contratanteData = {
                id: contratante[0].id,
                nome: contratante[0].nome,
                telefone: contratante[0].telefone,
                cpf: contratante[0].cpf,
                cep: contratante[0].cep,
                email: contratante[0].email,
                img_perfil: contratante[0].img_perfil
            }

            response.json(contratanteData);
        } catch (error) {
            console.log(error);
            response.status(500).json({ mensagem: 'Erro ao buscar o contratante' });

        }


    }
    //Atualizar um contratante
    async atualizarContratante(request, response) {
        const { id } = request.params;  // Obter o ID do contratante na URL
        const { nome, telefone, email, cep } = request.body;  // Obter os dados enviados para atualização

        // Verifica se o id foi fornecido na URL
        if (!id) {
            return response.status(400).json({ mensagem: 'ID do contratante é necessário' });
        }

        try {
            let latitude, longitude;

            // Se o CEP foi fornecido, obtém as coordenadas
            if (cep) {
                const coordinates = await getCoordinatesFromCep(cep);

                // Verifica se as coordenadas são válidas
                if (coordinates.message) {
                    return response.status(400).json({ mensagem: coordinates.message });
                }

                latitude = coordinates.latitude;
                longitude = coordinates.longitude;

                // Verifica se o 'cep' existe na tabela 'ceps'
                const cepExists = await database('ceps').where({ cep }).first();

                // Se o 'cep' não existir, vamos inseri-lo na tabela 'ceps' junto com as coordenadas
                if (!cepExists) {
                    await database('ceps').insert({
                        cep,
                        latitude,
                        longitude
                    });
                } else {
                    // Se o CEP já existir, você pode atualizar as coordenadas se necessário
                    await database('ceps')
                        .where({ cep })
                        .update({ latitude, longitude });
                }
            }

            // Atualiza os dados do contratante apenas com os campos fornecidos
            const updateData = {};
            if (nome) updateData.nome = nome;
            if (telefone) updateData.telefone = telefone;
            if (email) updateData.email = email;
            if (cep) updateData.cep = cep;

            // Verifica se há dados para atualizar
            if (Object.keys(updateData).length === 0) {
                return response.status(400).json({ mensagem: 'Nenhum dado para atualizar' });
            }

            // Atualiza os dados do contratante
            await database('contratantes')
                .where({ id })
                .update(updateData);

            // Responde com sucesso
            response.json({ mensagem: 'Seus dados foram atualizados com sucesso!' });
        } catch (error) {
            console.log(error);
            response.status(500).json({ mensagem: 'Erro ao atualizar o contratante' });
        }
    }
    //Atualizar senha
    async atualizarSenhaContratante(request, response) {
        const { novaSenha } = request.body;  // Recebe a nova senha

        try {
            // Verifica se a nova senha foi fornecida
            if (!novaSenha) {
                return response.status(400).json({ message: "Nova senha é obrigatória!" });
            }

            // Atualiza a senha no banco de dados (sem a necessidade de ID ou verificações extras)
            await database('contratantes')
                .where('id', request.usuario.id)  // Assume que o ID do usuário está no objeto `request.usuario`
                .update({ senha: novaSenha });

            // Retorna uma resposta de sucesso
            return response.status(200).json({ message: "Senha atualizada com sucesso!" });

        } catch (error) {
            console.error('Erro ao editar senha:', error);
            return response.status(500).json({ message: "Ocorreu um erro ao editar a senha." });
        }
    }
    //Atualizar foto de perfil
    async atualizarFotoPerfilContratante(request, response) {
        const { id } = request.params;
    
        if (!id) {
            return response.status(400).json({ mensagem: "ID do contratante é necessário" });
        }
    
        if (!request.file) {
            return response.status(400).json({ mensagem: "Nenhuma imagem foi enviada" });
        }
    
        try {
            // Buscar a URL da foto antiga no banco
            const contratante = await database("contratantes").where({ id }).first();
    
            if (contratante && contratante.img_perfil) {
                // Extrair o public_id da URL do Cloudinary
                const publicId = contratante.img_perfil.split("/").pop().split(".")[0];
    
                // Excluir a imagem anterior do Cloudinary
                await cloudinary.uploader.destroy(`perfil/contratante/${publicId}`);
            }
    
            cloudinary.uploader.upload_stream(
                { folder: "perfil/contratante", transformation: [{ width: 300, height: 300, crop: "fill" }] },
                async (error, result) => {
                    if (error) {
                        console.error("Erro no Cloudinary:", error);
                        return response.status(500).json({ mensagem: "Erro ao salvar a imagem no Cloudinary" });
                    }
    
                    // Atualizar a URL da imagem no banco
                    await database("contratantes").where({ id }).update({ img_perfil: result.secure_url });
    
                    response.json({ mensagem: "Foto de perfil atualizada com sucesso!", img_perfil: result.secure_url });
                }
            ).end(request.file.buffer);
    
        } catch (error) {
            console.error("Erro ao atualizar a foto de perfil:", error);
            response.status(500).json({ mensagem: "Erro ao atualizar a foto de perfil" });
        }
    }
    
    //Excluir tipos de serviços
    async excluirServicosContratante  (request, response) {
        const { id } =request.params; // ID do contratante recebido na requisição
   
        if (!id) {
            return response.status(400).json({ mensagem: "ID do contratante é obrigatório" });
        }
   
        try {
            // Verifica se o contratante existe antes de deletar os serviços
            const contratante = await database("contratantes").where({ id }).first();
   
            if (!contratante) {
                return response.status(404).json({ mensagem: "Contratante não encontrado" });
            }
   
            // Exclui os serviços postados pelo contratante
            await database("servicos_postados").where({ contratante_id: id }).del();
   
            response.json({ mensagem: "Todos os serviços postados foram excluídos com sucesso!" });
   
        } catch (error) {
            console.error("Erro ao excluir serviços postados:", error);
            response.status(500).json({ mensagem: "Erro ao excluir os serviços postados" });
        }
    }
    //Deletar um contratante
    async deletarContratante(request, response) {
        const { id } = request.params; //Obter o ID do contratante na URL

        //Verifica se o id foi fornecido na URL
        if (!id) {
            return response.status(400).json({ mensagem: 'ID do contratante é necessário' });

        }

        try {
            //verfica se o contratante existe
            const contratante = await database('contratantes').where({ id }).first();

            if (!contratante) {
                return response.status(404).json({ mensagem: 'Contratante não encontrado' });
            }

            //Remove os tipos de serviços associados ao contratante
            await database('servicos_postados')
                .where({ contratante_id: id })
                .del();

            // Responde com sucesso
            response.json({ mensagem: 'Sua conta foi excluída com sucesso!' });
        } catch (error) {
            console.log(error);
            response.status(500).json({ mensagem: 'Erro ao excluir a conta' });
        }

    }
}


module.exports = new perfilContratante();