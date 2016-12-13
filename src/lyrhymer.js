var http = require("http");
var twitter = require("twit");
var secrets = require("./superSecretConfidentialStuff");

(function () {
    console.log(secrets.test);

    var interval = 1000 * 60 * 60 * 12; // 12 hours
    var redoWait = 1000 * 2;

    var twit = new twitter({
        consumer_key: secrets.twitConKey,
        consumer_secret: secrets.twitConSec,
        access_token: secrets.twitAccTok,
        access_token_secret: secrets.twitAccTokSec,
        timeout_ms: 1000 * 60
    });

    // prepare for callback hell!
    (function commence() {
        setInterval((function () {
            var mxmHost = "api.musixmatch.com";
            var mxmPathVer = "/ws/1.1/";

            // Get top charts
            http.get({
                host: mxmHost,
                path: mxmPathVer + "chart.tracks.get?" +
                "apikey=" + secrets.mxmApiKey + "&" +
                "page=" + 1 + "&" +
                "page_size=" + 10 + "&" +
                "f_has_lyrics=" + 1 // TODO: magic strings
            }, function getTopCharts(res) {
                var chartBody = "";
                res.on("data", function (d) {
                    chartBody += d;
                });

                res.on("error", function (err) {
                    console.log("error getting charts!");
                    console.log(err);
                    setTimeout(commence, redoWait);
                    return;
                });

                res.on("end", function () {
                    var chartParsed;
                    console.log("done with chart request!");
                    try {
                        chartParsed = JSON.parse(chartBody);
                    }
                    catch (err) {
                        console.error("Couldn't parse chart");
                        setTimeout(commence, redoWait);
                        return;
                    }

                    // Get one of the tracks from the charts
                    // pick random object element, thanks SO http://stackoverflow.com/questions/2532218/pick-random-property-from-a-javascript-object
                    var track = chartParsed.message.body.track_list[Object.keys(chartParsed.message.body.track_list).length * Math.random() << 0].track;
                    http.get({
                        host: mxmHost,
                        path: mxmPathVer + "track.snippet.get?" +
                        "apikey=" + secrets.mxmApiKey + "&" +
                        "track_id=" + track.track_id
                    }, function getSnippetFromTrack(res) {
                        var snippetBody = "";
                        res.on("data", function (d) {
                            snippetBody += d;
                        });

                        res.on("error", function (err) {
                            console.log("error getting charts!");
                            console.log(err);
                            setTimeout(commence, redoWait);
                            return;
                        });

                        res.on("end", function () {
                            var snippetParsed;
                            console.log("done with snippet request!");
                            try {
                                snippetParsed = JSON.parse(snippetBody);
                            }
                            catch (err) {
                                console.error("couldn't parse snippet");
                                setTimeout(commence, redoWait);
                                return;
                            }

                            // We've now got a snippet result, lets get the last word and dump that into a rhymer-finder
                            // getting last word http://stackoverflow.com/questions/20883404/javascript-returning-the-last-word-in-a-string
                            var snippetLastWord = snippetParsed.message.body.snippet.snippet_body.slice(snippetParsed.message.body.snippet.snippet_body.lastIndexOf(" ") + 1);
                            http.get({
                                host: "api.datamuse.com",
                                path: "/words?rel_rhy=" + snippetLastWord
                            }, function getRhyme(res) {
                                var rhymesBody = "";
                                res.on("data", function (d) {
                                    rhymesBody += d;
                                });

                                res.on("error", function (err) {
                                    console.log("error getting charts!");
                                    console.log(err);
                                    setTimeout(commence, redoWait);
                                    return;
                                });

                                res.on("end", function () {
                                    var rhymesParsed;
                                    console.log("done with rhyme request!");
                                    try {
                                        rhymesParsed = JSON.parse(rhymesBody);
                                    }
                                    catch (err) {
                                        console.error("couldn't parse rhyme");
                                        setTimeout(commence, redoWait);
                                        return;
                                    }

                                    console.log(snippetParsed.message.body.snippet.snippet_body);
                                    var rhyme = rhymesParsed[Object.keys(rhymesParsed).length * Math.random() << 0];
                                    if(!rhyme) {
                                        console.log("there wasn't any suitable rhyme for the snippet word: " + snippetLastWord);
                                        setTimeout(commence, redoWait);
                                        return;
                                    }
                                    var rhymeWord = rhyme.word;
                                    console.log(rhymeWord);
                                });
                            });
                        });
                    });
                });
            });
        })(), interval);
    })();
})();