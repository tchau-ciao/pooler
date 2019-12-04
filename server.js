// server.js
// This is a minimal HTTP server written in Node's native http module

// this is Node.js native modules
//const http = require('http') // handles http connection
//const url = require('url')   // used to parse url strings
//const path = require('path') // used to inspect & create filepath

var express = require("express");
const bodyParser = require("body-parser");
const request = require("./request");
var app = express();

app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

const winnerPlaceholder = '${USER}'

const modal = require("./modal");

// random pick one user from the array
function randomUserSelect(users) {
  return users[Math.floor(Math.random() * users.length)];
}

// get info from user
async function getUserInfo(user) {
  let { response, body } = await request.exec({
    url: "https://slack.com/api/users.info?user=" + user,
    headers: {
      Authorization: "Bearer " + process.env.SLACK_ACCESS_TOKEN
    }
  });
  return JSON.parse(body).user;
}

// post winner message to channels
function postWinnerMessage(winner, channels, title, message, userInfo) {
  channels.forEach(ch => {
    request.exec({
      method: "POST",
      url: "https://slack.com/api/chat.postMessage",
      headers: {
        Authorization: "Bearer " + process.env.SLACK_ACCESS_TOKEN
      },
      json: {
        channel: ch,
        text: message,
        as_user: false,
        icon_emoji: ":tada",
        attachments: [
          {
            //pretext: message,
            color: '#36a64f',
            author_name: userInfo.real_name,
            author_icon: userInfo.profile.image_48,
            thumb_url: userInfo.profile.image_192,
            footer: title,
            ts: Date.now()
          }
        ]
      }
    });
  });
}

async function getAllUsers(candidates) {
  let promises = candidates.map(id => {
    return getUserInfo(`${id}`);
  });
  return await Promise.all(promises);
}

// post message to channels
function postPoolMessage(channels, title, message, candidates) {
  const candidatesArr = getAllUsers(candidates);
  var users = ""
  candidatesArr.then(arr => {
    arr.forEach(user => {
      users = users.concat(`<@${user.id}>\n`)
    });

    channels.forEach(ch => {
      request
        .exec({
          method: "POST",
          url: "https://slack.com/api/chat.postMessage",
          headers: {
            Authorization: "Bearer " + process.env.SLACK_ACCESS_TOKEN
          },
          json: {
            channel: ch,
            text: `*${title}*`,
            as_user: false,
            icon_emoji: ":tada",
            attachments: [
              {
                pretext: message,
                text: users,
                color: '#36a64f'
              }
            ]
          }
        })
        .then(res => {});
    });
  });
}

/*
 * Routes
 */

app.get("/", function(req, res) {
  res.send("");
});

app.post("/interaction", (req, res) => {
  const { type, view } = JSON.parse(req.body.payload);

  if (type === "view_submission") {
    var users = [];
    var channels = [];
    var poolMessage = "";
    var winnerMessage = "";
    var title = "";

    const state = view.state.values;
    for (var p in state) {
      if (state[p].hasOwnProperty("users")) {
        users = state[p].users.selected_users;
      }

      if (state[p].hasOwnProperty("channels")) {
        channels = state[p].channels.selected_channels;
      }

      if (state[p].hasOwnProperty("text")) {
        poolMessage = state[p].text.value;
      }

      if (state[p].hasOwnProperty("text_winner")) {
        winnerMessage = state[p].text_winner.value;
      }

      if (state[p].hasOwnProperty("title")) {
        title = state[p].title.value;
      }
    }
    
    if(winnerMessage.indexOf(winnerPlaceholder) == -1){
     console.log("ERR: missing winnerPlaceholder")
    } 
    res.end("");

    // pick the winner
    const winner = randomUserSelect(users);

    // get user info and post the message
    const userInfo = getUserInfo(winner);
    

    winnerMessage = winnerMessage.replace(winnerPlaceholder, `<@${winner}>`);

    postPoolMessage(channels, title, poolMessage, users);

    setTimeout(() => {
      userInfo.then(user => {
        postWinnerMessage(winner, channels, title, winnerMessage, user);
      })
    }, 3000);
  }
});

async function openModal(dialog) {
  const view = await request.exec({
    method: "POST",
    url: "https://slack.com/api/views.open",
    headers: {
      Authorization: "Bearer " + process.env.SLACK_ACCESS_TOKEN
    },
    json: dialog
  });

  return view;
}

app.post("/pool", (req, res) => {
  const payload = req.body;

  const dialog = {
    trigger_id: payload.trigger_id,
    view: modal
  };

  openModal(dialog);
  res.end("");
});

app.listen(process.env.PORT, function() {
  console.log("Example app listening on port 3000!");
});
