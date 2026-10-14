import {initBotId} from 'botid/client/core';
initBotId({protect:[
 {path:'/api/auth/sign-up',method:'POST',advancedOptions:{checkLevel:'basic'}},
 {path:'/api/auth/sign-in',method:'POST',advancedOptions:{checkLevel:'basic'}},
 {path:'/api/auth/recover',method:'POST',advancedOptions:{checkLevel:'basic'}},
 {path:'/api/auth/access-request',method:'POST',advancedOptions:{checkLevel:'basic'}}
]});
