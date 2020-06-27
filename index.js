// Load ENV variables
require('dotenv').config();

// Load dependencies
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const Twitter = require("twitter-lite");

// DB setup
const adapter = new FileSync('db.json');
const db = low(adapter)
db.defaults({statuses_retweeted: []}).write();

// Twitter client setup
let twClient = new Twitter({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.ACCESS_TOKEN_KEY,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

// Helper functions
function getStatusesRetweeted() {
  return db.getState()['statuses_retweeted'];
}

function searchIfStatusIsRT(statusId) {
  return getStatusesRetweeted().includes(statusId);
}

function filterTweets(tweets) {
  return tweets.filter(tweet => {
    if (tweet["user"]["name"] === "fridaycodechill") { return false }; // When the tweet is from us
    if (tweet["in_reply_to_status_id"] != null) { return false }; // When the tweet is a reply
    if ("retweeted_status" in tweet) { return false }; // When is a retweet
    if (searchIfStatusIsRT(tweet["id_str"])) { return false } // When we already retweeted this
  
    return true;
  })
}

// Main action
twClient.get("search/tweets", {q: "fridaycodechill", count: 100})
  .then(results => {
    let tweets = results['statuses'];
    
    // retweet
    filterTweets(tweets).forEach(tweet => {
      twClient.post(`statuses/retweet/${tweet["id_str"]}`).then(results => {
        db.get('statuses_retweeted').push(tweet["id_str"]).write();
      })
      .catch(console.error)
      .finally(() => console.log('Retweeted: ', tweet["text"]))
    });
  })
  .catch(console.error)
  .finally(() => console.log('finish'));