const axios = require('axios');

class AnkiApi {
    
    async req(action, version, params={}) {
        return axios.post("http://localhost:8765", { action, version, params })
    }

    async sync() {
        const res = await this.req("sync", 6);

        return res.data;
    }

    async addCard(front, back, deck = "bot", modelName = "Basic") {
        const res = await this.req("addNote", 6, {
            note: {
                deckName: deck, 
                modelName,
                fields: {
                    "Front": front,
                    "Back": back,
                }
            }
        });

        return res.data;
    }
}

module.exports = AnkiApi
