const axios = require('axios');

async function getCoordinatesFromCep(cep) {
    try {
        const viaCepResponse = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);

        if (viaCepResponse.data.erro) {
            return { message: "Não foi possível obter a localização para o CEP informado." };
        }

        const { logradouro, bairro, localidade, uf } = viaCepResponse.data;
        const address = `${logradouro}, ${localidade} - ${uf}, Brazil`;

        const geoResponse = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`, {
            headers: {
                'User-Agent': 'arthur.agomes06@gmail.com'
            }
        });

        if (geoResponse.data.length === 0) {
            return { message: "Não foi possível obter a localização para o CEP informado." };
        }

        const { lat, lon } = geoResponse.data[0];
        return {
            latitude: parseFloat(lat),
            longitude: parseFloat(lon),
            logradouro,
            bairro, 
            localidade 
        };
    } catch (error) {
        console.error('Erro ao obter coordenadas do CEP:', error);
        return { message: "Erro ao obter a localização para o CEP informado." };
    }
}

module.exports = getCoordinatesFromCep;
