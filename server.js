// server.js
// This is a minimal HTTP server written in Node's native http module

// this is Node.js native modules
//const http = require('http') // handles http connection
//const url = require('url')   // used to parse url strings
//const path = require('path') // used to inspect & create filepath

var express = require("express");
const bodyParser = require("body-parser");
var request = require("request");
var app = express();

app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

const signature = require("./verifySignature");

var modal = {
  type: "modal",
  title: {
    type: "plain_text",
    text: "Create your Pool",
    emoji: true
  },
  submit: {
    type: "plain_text",
    text: "Submit",
    emoji: true
  },
  close: {
    type: "plain_text",
    text: "Cancel",
    emoji: true
  },
  blocks: [
    {
      type: "input",
      element: {
        type: "plain_text_input",
        action_id: "title",
        placeholder: {
          type: "plain_text",
          text: "Title of the Pool"
        }
      },
      label: {
        type: "plain_text",
        text: "Title"
      }
    },
    {
      type: "input",
      element: {
        type: "multi_channels_select",
        action_id: "channels",
        placeholder: {
          type: "plain_text",
          text: "Where should the pool be sent?"
        }
      },
      label: {
        type: "plain_text",
        text: "Channel(s)"
      }
    },
    {
      type: "input",
      element: {
        type: "multi_users_select",
        action_id: "users",
        placeholder: {
          type: "plain_text",
          text: "Type winners name"
        }
      },
      label: {
        type: "plain_text",
        text: "Candidates"
      }
    },
    {
      type: "input",
      element: {
        type: "plain_text_input",
        action_id: "text",
        multiline: true
      },
      label: {
        type: "plain_text",
        text: "Text"
      }
    }
  ]
};

// random pick one user from the array
function randomUserSelect(users) {
  return users[Math.floor(Math.random() * users.length)];
}

// get info from user
function getUserInfo(user, cb) {
  request.get(
    {
      url: "https://slack.com/api/users.info?user=" + user,
      headers: {
        Authorization: "Bearer " + process.env.SLACK_ACCESS_TOKEN
      }
    },
    function(error, response, body) {
      if (!error && response.statusCode == 200) {
        const userBody = JSON.parse(body);
        return cb(userBody.user);
      } else {
        console.log(error);
      }
    }
  );
}

// post message to channels
function postMessage(winner, channels, title, message, userInfo) {
  channels.forEach(ch => {
    request.post(
      {
        url: "https://slack.com/api/chat.postMessage",
        headers: {
          Authorization: "Bearer " + process.env.SLACK_ACCESS_TOKEN
        },
        json: {
          channel: ch,
          text: `The winner is <@${winner}>`,
          as_user: false,
          icon_emoji: ":tada",
          attachments: [
            {
              pretext: message,
              color: userInfo.color,
              author_name: userInfo.real_name,
              author_icon: userInfo.profile.image_24,
              title: title
            }
          ]
        }
      },
      function(error, response, body) {
        if (!error && response.statusCode == 200) {
          //console.log(body);
        } else {
          console.log(error);
        }
      }
    );
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
    var message = "";
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
        message = state[p].text.value;
      }
      
      if (state[p].hasOwnProperty("title")) {
        title = state[p].title.value
      }
    }

    // pick the winner
    const winner = randomUserSelect(users);

    // get user info and post the message
    getUserInfo(winner, userInfo => {
      res.end("");
      postMessage(winner, channels, title, message, userInfo);
    });
  }
});

app.post("/pool", (req, res) => {
  const payload = req.body;

  const dialog = {
    trigger_id: payload.trigger_id,
    view: modal
  };
  request.post(
    {
      url: "https://slack.com/api/views.open",
      headers: {
        Authorization: "Bearer " + process.env.SLACK_ACCESS_TOKEN
      },
      json: dialog
    },
    function(error, response, body) {
      if (!error && response.statusCode == 200) {
        //console.log(body);
      } else {
        console.log(error);
      }
    }
  );
  res.end("");
});

app.listen(process.env.PORT, function() {
  console.log("Example app listening on port 3000!");
});
