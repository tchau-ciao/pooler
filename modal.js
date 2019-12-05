module.exports = {
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
        type: "plain_text_input",
        action_id: "text",
        placeholder: {
          type: "plain_text",
          text: "Type something for the candidates"
        },
        multiline: true
      },
      label: {
        type: "plain_text",
        text: "Text"
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
          text: "Type candidates name"
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
        action_id: "number_winners",
        initial_value: "1",
        multiline: false
      },
      label: {
        type: "plain_text",
        text: "Number of Winners"
      }
    },
    {
      type: "input",
      element: {
        type: "plain_text_input",
        action_id: "text_winner",
        initial_value: "The winner is ${USER}",
        multiline: false
      },
      label: {
        type: "plain_text",
        text: "Winner Message"
      }
    }
  ]
};
