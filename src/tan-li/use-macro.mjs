import idx from 'idx.macro';
const friends_of_friends = idx(props, _ => _.user.friends[0].friends);
const friends_of_my = idx(props, _ => _.user.friends[0].friends);