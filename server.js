// server.js

var express = require("express");
const bodyParser = require("body-parser");
const request = require("./request");
var app = express();

app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

const modal = require("./modal");
const c = require("./constants");

// random pick one user from the array
function randomUserSelect(users) {
  return users[Math.floor(Math.random() * users.length)];
}

// select *number* users from the list (if number is less than users.length, returns the full list randomized)
function randomUsersSelect(users, number) {
  let selectedUsers = []
  let usersLength = users.length
  for(let i = 0; i < number && i < usersLength; i++){
    let user = randomUserSelect(users)
    let index = users.indexOf(user);
    if (index > -1) {
      users.splice(index, 1);
    }
    selectedUsers.push(user)
  }
  return selectedUsers
}

// get info from user
async function getUserInfo(user) {
  let { response, body } = await request.exec({
    url: "https://slack.com/api/users.info?user=" + user,
    headers: c.HEADERS
  });
  return JSON.parse(body).user;
}

// post winner message to channels
function postWinnerMessage(winnersInfo, channels, title, message) {
  let attachments = []
  
  winnersInfo.forEach(userInfo => {
    attachments.push({
        //pretext: message,
        color: '#36a64f',
        author_name: userInfo.real_name,
        author_icon: userInfo.profile.image_48,
        thumb_url: userInfo.profile.image_192,
        footer: title,
        ts: Date.now()
      })
  })
  
  let jsonPayload = {
    text: message,
    as_user: false,
    icon_emoji: ":tada",
    attachments: attachments
  }
  postMessage(channels, jsonPayload)
}

async function getAllUsers(candidates) {
  let promises = candidates.map(id => {
    return getUserInfo(`${id}`);
  });
  return await Promise.all(promises);
}


// post message poolMessage to all channels
function postPoolMessage(channels, title, message, candidates) {
  const candidatesArr = getAllUsers(candidates);
  let users = ""
  candidatesArr.then(arr => {
    arr.forEach(user => {
      users = users.concat(`<@${user.id}>\n`)
    });
    
    let jsonPayload = {
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
    postMessage(channels, jsonPayload)
  });
}



// post message to channels
function postMessage(channels, jsonPayload) {
    channels.forEach(ch => {
      // set channel name
      jsonPayload.channel = ch
      
      // send message
      request.exec({
          method: "POST",
          url: "https://slack.com/api/chat.postMessage",
          headers: c.HEADERS,
          json: jsonPayload
        }).then(res => {});
    });
}

// initialize the fields of the modal with the provided values
function setInitialValues(modal, poolMessage, winnerMessage, title, users, channels, number_winners){
  modal.blocks.forEach(block => {
    if(block.element !== undefined && block.element.action_id !== undefined){
      switch(block.element.action_id){
        case 'users': block.element.initial_users = users; break;
        case 'channels': block.element.initial_channels = channels; break;
        case 'text': block.element.initial_value = poolMessage; break;
        case 'text_winner': block.element.initial_value = winnerMessage; break;
        case 'title': block.element.initial_value = title; break;
        case 'number_winners': block.element.initial_value = ""+number_winners; break;
      }
    }
  })
  
  return modal
}

/*
 * Routes
 */

app.get("/", function(req, res) {
  res.send("");
});

app.post("/components", (req, res) => {
  console.log("DYNAMIC COMPONENTS")
  res.end("")
})


app.post("/interaction", (req, res) => {
  const { type, view } = JSON.parse(req.body.payload);

  
  if (type === "view_submission") {
    console.log("SUBMISSION")
    var users = [];
    var channels = [];
    var poolMessage = "";
    var winnerMessage = "";
    var title = "";
    var number_winners = 1;

    // read input data
    const state = view.state.values;
    for (var p in state) {
      if (state[p].hasOwnProperty("users")) users = state[p].users.selected_users
      if (state[p].hasOwnProperty("channels")) channels = state[p].channels.selected_channels
      if (state[p].hasOwnProperty("text")) poolMessage = state[p].text.value
      if (state[p].hasOwnProperty("text_winner")) winnerMessage = state[p].text_winner.value
      if (state[p].hasOwnProperty("title")) title = state[p].title.value
      if (state[p].hasOwnProperty("number_winners")) number_winners = state[p].number_winners.value
    }
    
    // validate user input. if not valid, ask for new form submission
    var errorMessage = null
    if(winnerMessage.indexOf(c.WINNER_PLACEHOLDER) == -1){
     errorMessage = `:exclamation: You must include the placeholder ${c.WINNER_PLACEHOLDER} in Winner Message`
    }
    
    if(isNaN(number_winners) || parseInt(number_winners) <= 0){
     errorMessage = c.NUM_WIN_ERROR
    } else {
     number_winners = parseInt(number_winners)
    }
    // if input is invalid, display error message
    if(errorMessage !== null){
     // clone the modal
     var errorModal = JSON.parse(JSON.stringify(modal)); // clone the modal
      
     // preserving input data
     errorModal = setInitialValues(
       errorModal, poolMessage, winnerMessage, title, users, channels, number_winners)
      
     // add an error message 
     errorModal.blocks.push({
        "type": "section",
        "text": {
          "type": "plain_text",
          "emoji": true,
          "text": errorMessage
        }
      })
      
     // update the view
     res.json({
      "response_action": "update",
      "view": errorModal
     })
     return // end processing and wait for new form submission
    }
    
    
    res.end(""); // confirm to the client that the form has valid data (ie. the modal can be closed and the request will be processed)

    // pick the winner
    const winners = randomUsersSelect(users, number_winners) //  ##################### TODO ################ . replace '2' with input number
    const winnersArr = getAllUsers(winners);
    
    let winnersString = ""
    winners.forEach( function(w, index) {
      this[index] = `<@${w}>`
    }, winners);
    winnersString = winners.join(',')

    // inject the user in the winnerMessage
    winnerMessage = winnerMessage.replace(c.WINNER_PLACEHOLDER, winnersString);

    postPoolMessage(channels, title, poolMessage, users);

    // wait POOL_TIMER before posting the winner
    setTimeout(() => {
      winnersArr.then(winnersInfo => {
        postWinnerMessage(winnersInfo, channels, title, winnerMessage, users);
      })
    }, c.POOL_TIMEOUT);

  }
});

async function openModal(dialog) {
  const view = await request.exec({
    method: "POST",
    url: "https://slack.com/api/views.open",
    headers: c.HEADERS,
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
  console.log("Pooler listening on port 3000!");
});
