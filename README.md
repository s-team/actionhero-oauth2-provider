# actionhero OAuth2 provider

Create a OAuth2 provider/server with actionhero

Install: 
```bash
npm install actionhero-oauth2-provider
```

create a new initializer inside your actionhero project.

e.g. `oauth2.js` with the following content
```js
var OAuth2Provider = require('actionhero-oauth2-provider');

var provider = new OAuth2Provider(); 



provider.on('validate_user', function(api, connection, next){
  var authorize_url = connection.params.authorize_url;
  if(/*the user is logged in.*/){
    next();
  }else{
    //redirect to the login page
    res.writeHead(303, {Location: '/login'});
    res.end();
    next(false);
  }
});



provider.on('validate_client', function(api, connection, next){
  var client_id = connection.params.client_id;
  
  if(/*client_id valid?*/){
    next();
  }else{
    connection.error = 'invalid client id!';
    next(false);
  }
});


provider.on('validate_grant', function(api, connection, next){
  var client_id = connection.params.client_id;
  var user_id = connection.session.user_id;
  
  if(/*grants exists?*/){
    next();
  }else{
    //redirect
    res.writeHead(303, {Location: '/grant'});
    res.end();
    next(false);
  }
});


provider.on('validate_code', function(api, connection, next){
  var client_id = connection.params.client_id;
  var code = connection.params.code;
  
  if(/*code is valid?*/){
    next();
  }else{
    connection.error = 'invalid code!';
    next(false);
  }
});


provider.on('validate_access_token', function(api, connection, next){
  var client_id = connection.params.client_id;
  var access_token = connection.params.access_token;
  
  if(/*access_token is valid?*/){
    //set session variables here if needed
    next();
  }else{
    connection.error = 'invalid access_token!';
    next(false);
  }
});




provider.on('save_code', function(api, connection, next){
  var user_id = connection.session.user_id;
  var client_id = connection.params.client_id;
  var code = connection.params.code;
  
  //save code here
  next();
});


provider.on('destroy_code', function(api, connection, next){
  var client_id = connection.params.client_id;
  var code = connection.params.code;
  
  //destroy code here
  next();
});



provider.on('save_access_token', function(api, connection, next){
  var client_id = connection.params.client_id;
  var code = connection.params.code;
  var access_token = connection.params.access_token;
  
  //save access_token here
  next();
});


//export the initializer for actionhero
exports.oauth2 = provider.initializer;
```