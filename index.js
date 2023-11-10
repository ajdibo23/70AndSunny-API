const axios = require('axios');
const jsdom = require('jsdom');
const fs = require('fs');
const app = require('express')();
const possibleWeathers = ["Clear", "Mostly Cloudy", "Mostly Clear", "Partly Cloudy", "Cloudy"]
const rains = ["Fog", "Thunderstorm", "Thunderstorm In Vicinity", "Light Rain", "Light Rain Mist", "Thunderstorm Rain Mist", "Light Thunderstorm Rain", "Heavy Thunderstorm Rain", "Light Drizzle"]

app.get('/:state/:location', (req, res) => {
    //let exists = fs.existsSync('./states/'+req.params.state+".json")
    //if (exists) {
    //    res.send(fs.readFileSync('./states/'+req.params.state+".json", 'utf8'))
    //    return;
    //}
    //const location = req.params.location;
    let state = req.params.state.toLocaleLowerCase();
    state = state.replace('%20', '-');
    state = state.replace(' ', '-');
    axios.get(`https://www.usairnet.com/weather/maps/current/${state}/temperature/`)
        .then(response => {
            const dom = new jsdom.JSDOM(response.data);
            const document = dom.window.document;
            let surfaceMap = document.getElementById(`surfacemap`);
            let stuff = [];
            for (let i = 0; i < surfaceMap.children.length; i++) {
                let temp = surfaceMap.children[i].getAttribute('onmouseover').split('°')[0];
                temp = temp.split("").reverse().join("");
                temp = temp.split('>')[0]
                temp = temp.split("").reverse().join("");
                let weather = ""
                let rain = ""
                for (let j = 0; j < possibleWeathers.length; j++) {
                    if (surfaceMap.children[i].getAttribute('onmouseover').includes(possibleWeathers[j])) {
                        weather = possibleWeathers[j];
                        break;
                    }
                }
                for (let j = 0; j < rains.length; j++) {
                    if (surfaceMap.children[i].getAttribute('onmouseover').includes(rains[j])) {
                        rain = rains[j];
                        break;
                    }
                }
                if (weather == "Clear") {
                    weather = "Sunny"
                }
                if (rain) {
                    rain = "Rain Status: " + rain
                }
                stuff.push({
                    name: surfaceMap.children[i].getAttribute('alt').toString().split(' Temperatur')[0],
                    temp: parseFloat(temp),
                    weather: weather,
                    rain: rain
                });
            }
            let states = findBorderingStates(state);
            let statesNum = 0;
            for (let k = 0; k < states.length; k++) {
                states[k] = states[k].toLowerCase();
                states[k] = states[k].replace('%20', '-');
                states[k] = states[k].replace(' ', '-');
                axios.get(`https://www.usairnet.com/weather/maps/current/${states[k]}/temperature/`)
                    .then(response => {
                        const dom = new jsdom.JSDOM(response.data);
                        const document = dom.window.document;
                        let surfaceMap = document.getElementById(`surfacemap`);
                        for (let i = 0; i < surfaceMap.children.length; i++) {
                            let temp = surfaceMap.children[i].getAttribute('onmouseover').split('°')[0];
                            temp = temp.split("").reverse().join("");
                            temp = temp.split('>')[0]
                            temp = temp.split("").reverse().join("");
                            let weather = ""
                            let rain = ""
                            for (let j = 0; j < possibleWeathers.length; j++) {
                                if (surfaceMap.children[i].getAttribute('onmouseover').includes(possibleWeathers[j])) {
                                    weather = possibleWeathers[j];
                                    break;
                                }
                            }
                            for (let j = 0; j < rains.length; j++) {
                                if (surfaceMap.children[i].getAttribute('onmouseover').includes(rains[j])) {
                                    rain = rains[j];
                                    break;
                                }
                            }
                            if (weather == "Clear") {
                                weather = "Sunny"
                            }
                            if (rain) {
                                rain = "Rain Status: " + rain
                            }
                            stuff.push({
                                name: surfaceMap.children[i].getAttribute('alt').toString().split(' Temperatur')[0],
                                temp: parseFloat(temp),
                                weather: weather,
                                rain: rain
                            });
                            if (i == surfaceMap.children.length - 1) {
                                statesNum++;
                                if (statesNum == states.length) {
                                    let groups = { "Sunny": [], "Mostly Clear": [], "Partly Cloudy": [], "Mostly Cloudy": [], "Cloudy": [] }
                                    for (let i = 0; i < stuff.length; i++) {
                                        groups[stuff[i].weather].push(stuff[i])
                                    }
                                    //sort each group
                                    for (let i = 0; i < Object.keys(groups).length; i++) {
                                        groups[Object.keys(groups)[i]] = groups[Object.keys(groups)[i]].sort((a, b) => a.temp - b.temp);
                                        groups[Object.keys(groups)[i]] = groups[Object.keys(groups)[i]].reverse();
                                    }
                                    fs.writeFileSync('./states/' + state + ".json", JSON.stringify(groups))
                                    res.send(groups);
                                }
                            }
                        }
                    })
                    .catch(error => {
                        console.log(error)
                    });
            }
        }).catch(error => {
            console.log(error)
        });
});

function findBorderingStates(state) {
    state = state.charAt(0).toUpperCase() + state.slice(1);
    state = state.replace('-', ' ');
    if (state.includes(' ')) {
        state = state.split(' ');
        state[0] = state[0].charAt(0).toUpperCase() + state[0].slice(1);
        state[1] = state[1].charAt(0).toUpperCase() + state[1].slice(1);
        state = state[0] + ' ' + state[1];
    }
    switch (state) {
        case 'Illinois':
            return ['Wisconsin', 'Iowa', 'Missouri', 'Kentucky', 'Indiana'];
        case 'Wisconsin':
            return ['Illinois', 'Iowa', 'Minnesota'];
        case 'Iowa':
            return ['Illinois', 'Wisconsin', 'Minnesota', 'South Dakota', 'Nebraska', 'Missouri'];
        case 'Minnesota':
            return ['Wisconsin', 'Iowa', 'South Dakota', 'North Dakota'];
        case 'South Dakota':
            return ['North Dakota', 'Minnesota', 'Iowa', 'Nebraska', 'Wyoming', 'Montana'];
        case 'North Dakota':
            return ['Minnesota', 'South Dakota', 'Montana'];
        case 'Nebraska':
            return ['South Dakota', 'Iowa', 'Missouri', 'Kansas', 'Colorado', 'Wyoming'];
        case 'Missouri':
            return ['Iowa', 'Illinois', 'Kentucky', 'Tennessee', 'Arkansas', 'Oklahoma', 'Kansas', 'Nebraska'];
        case 'Kentucky':
            return ['Illinois', 'Missouri', 'Tennessee', 'Virginia', 'West Virginia', 'Ohio', 'Indiana'];
        case 'Indiana':
            return ['Illinois', 'Kentucky', 'Ohio', 'Michigan'];
        case 'Michigan':
            return ['Indiana', 'Ohio', 'Wisconsin'];
        case 'Ohio':
            return ['Indiana', 'Kentucky', 'West Virginia', 'Pennsylvania', 'Michigan'];
        case 'West Virginia':
            return ['Ohio', 'Kentucky', 'Virginia', 'Maryland', 'Pennsylvania'];
        case 'Virginia':
            return ['West Virginia', 'Kentucky', 'Tennessee', 'North Carolina', 'Maryland'];
        case 'Maryland':
            return ['Virginia', 'West Virginia', 'Pennsylvania', 'Delaware'];
        case 'Delaware':
            return ['Maryland', 'Pennsylvania', 'New Jersey'];
        case 'Pennsylvania':
            return ['Ohio', 'West Virginia', 'Maryland', 'Delaware', 'New Jersey', 'New York'];
        case 'New Jersey':
            return ['Pennsylvania', 'Delaware', 'New York'];
        case 'New York':
            return ['New Jersey', 'Pennsylvania', 'Vermont', 'Massachusetts', 'Connecticut'];
        case 'Vermont':
            return ['New York', 'Massachusetts', 'New Hampshire'];
        case 'Massachusetts':
            return ['Vermont', 'New York', 'Connecticut', 'Rhode Island', 'New Hampshire'];
        case 'Connecticut':
            return ['Massachusetts', 'New York', 'Rhode Island'];
        case 'Rhode Island':
            return ['Connecticut', 'Massachusetts'];
        case 'New Hampshire':
            return ['Vermont', 'Massachusetts', 'Maine'];
        case 'Maine':
            return ['New Hampshire'];
        case 'Arkansas':
            return ['Missouri', 'Tennessee', 'Mississippi', 'Louisiana', 'Texas', 'Oklahoma'];
        case 'Tennessee':
            return ['Kentucky', 'Virginia', 'North Carolina', 'Georgia', 'Alabama', 'Mississippi', 'Arkansas', 'Missouri'];
        case 'North Carolina':
            return ['Virginia', 'Tennessee', 'Georgia', 'South Carolina'];
        case 'South Carolina':
            return ['North Carolina', 'Georgia'];
        case 'Georgia':
            return ['South Carolina', 'North Carolina', 'Tennessee', 'Alabama', 'Florida'];
        case 'Alabama':
            return ['Georgia', 'Tennessee', 'Mississippi', 'Florida'];
        case 'Mississippi':
            return ['Alabama', 'Tennessee', 'Arkansas', 'Louisiana'];
        case 'Louisiana':
            return ['Arkansas', 'Mississippi', 'Texas'];
        case 'Texas':
            return ['Arkansas', 'Louisiana', 'Oklahoma', 'New Mexico'];
        case 'Oklahoma':
            return ['Kansas', 'Missouri', 'Arkansas', 'Texas', 'New Mexico', 'Colorado'];
        case 'Kansas':
            return ['Nebraska', 'Missouri', 'Oklahoma', 'Colorado'];
        case 'Colorado':
            return ['Wyoming', 'Nebraska', 'Kansas', 'Oklahoma', 'New Mexico', 'Utah'];
        case 'Wyoming':
            return ['Montana', 'South Dakota', 'Nebraska', 'Colorado', 'Utah', 'Idaho'];
        case 'Montana':
            return ['North Dakota', 'South Dakota', 'Wyoming', 'Idaho'];
        case 'Idaho':
            return ['Montana', 'Wyoming', 'Utah', 'Nevada', 'Oregon', 'Washington'];
        case 'Utah':
            return ['Idaho', 'Wyoming', 'Colorado', 'New Mexico', 'Arizona', 'Nevada'];
        case 'New Mexico':
            return ['Colorado', 'Oklahoma', 'Texas', 'Arizona', 'Utah'];
        case 'Arizona':
            return ['Utah', 'New Mexico', 'California', 'Nevada'];
        case 'Nevada':
            return ['Idaho', 'Utah', 'Arizona', 'California', 'Oregon'];
        case 'California':
            return ['Oregon', 'Nevada', 'Arizona'];
        case 'Oregon':
            return ['Washington', 'Idaho', 'Nevada', 'California'];
        case 'Washington':
            return ['Oregon', 'Idaho'];
        case 'Florida':
            return ['Alabama', 'Georgia'];
        case 'Alaska':
            return ['Washington'];
        case 'Hawaii':
            return ['California'];
        default:
            return [];
    }
}

app.listen(3333)