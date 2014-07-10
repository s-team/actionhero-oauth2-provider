var querystring = require('querystring');
var events      = require('events');
var util        = require('util');
var crypto      = require('crypto');

var OAuth2Provider = function(config){
  var self = this;
  
  var config = config || {};
  
  this.initializer = function(api, next){
    
    self.crypt_key          = config.crypt_key || api.config.general.id;
    self.sign_key           = config.sign_key ||  api.config.general.serverToken;
    self.action             = config.action || 'oauth';
    self.authorize_path     = config.authorize_path || '/api/' + self.action + '/authorize';
    self.access_token_path  = config.access_token_path || '/api/' + self.action + '/access_token';
    self.acces_token_name   = config.acces_token_name || 'access_token';
  
  
  
    //allow param access_token for all actions
    api.params.globalSafeParams.push(self.acces_token_name);
    
    api.oauth2 = {
      _start: function(api, next){
        self.createDummyAction(api);  
        self.createPreProcessor(api);
        next();
      }
    }
  
    next();
  };
  
};


util.inherits(OAuth2Provider, events.EventEmitter);



OAuth2Provider.prototype.createDummyAction = function(api){
  //dummy action to allow /api/oauth
  api.actions.versions[this.action] = [2];
  api.actions.actions[this.action] = {
    '2': { 
      name: this.action,
      description: 'OAuth2',
      inputs: { required: [], optional: ['client_id', 'redirect_uri', 'response_type', 'scope', 'allow', 'code', 'username', 'password'] },
      outputExample: {},
      requireAuth: false,
      run: function(api, connection, next){
        next(connection, true);
      },
      version: 2
    }
  };
  
  //to rebuild the required and optional params for the dummy action...
  api.params.buildPostVariables();
};



OAuth2Provider.prototype.createPreProcessor = function(api){
  var self = this;
  
  api.actions.addPreProcessor(function(connection, actionTemplate, next){

    if(actionTemplate.name == self.action){
      if(connection.type == 'web'){
        var req = connection.rawConnection.req;
        
        connection.params.authorize_url = req.url;

        if(req.url.match(self.authorize_path)){
          return self.authorize(api, connection, next);
        }
        
        if(req.url.match(self.access_token_path)){
          return self.access(api, connection, next);
        }
        
        connection.error = 'unsupported url';
      }else{
        connection.error = 'OAuth2 via ' + connection.type + ' is not supported!';
      }

      return next(connection, false);
    }
    
    if(connection.params.access_token && actionTemplate.OAuthCheck !== false){
      self.emit('validate_access_token', api, connection, function(error){
        if(error == null || error === true){
          next(connection, true);
        }else{
          next(connection, false);
        }        
      });                
    }else{      
      next(connection, true);
    }
  });
};



OAuth2Provider.prototype.authorize = function(api, connection, next){
  var self = this;
  
  //check if user is logged in
  self.emit('validate_user', api, connection, function(error){
            
    if(error == null || error === true){
      //check if client is valid
      return self.emit('validate_client', api, connection, function(error){
      
        if(error == null || error === true){
          //check if there is a grant
          return self.emit('validate_grant', api, connection, function(error){
        
            if(error == null || error === true){

              //Create code
              var code = connection.params.code = self.createRandomHash(64);
            
              return self.emit('save_code', api, connection, function(error){
                if(error == null || error === true){

                  var res = connection.rawConnection.res;
                  var url = connection.params.redirect_uri;
                
                  switch(connection.params.response_type) {
                    //case 'code': url += '?'; break;
                    case 'token': url += '#'; break;
                    default:
                      url += '?';
                  }
                
                  url += querystring.stringify({code:code});
                
                  res.writeHead(303, {Location: url});
                  res.end();
                }
              
                next(connection, true);
              });
              //Return to CLIENT!
            }
            
            next(connection, true);
          });
        
        }
            
        next(connection, true);
      });
    }
            
    next(connection, true);
  });  
};




OAuth2Provider.prototype.access = function(api, connection, next){
  var self = this;
  
  //check if the code is valide
  self.emit('validate_code', api, connection, function(error){
  
    if(error == null || error === true){
      
      //Create access_token  
      var access_token = connection.params.access_token = self.createRandomHash(128);
  
      //save the access_token
      return self.emit('save_access_token', api, connection, function(error){
        
        if(error == null || error === true){
          
          //destroy the code
          return self.emit('destroy_code', api, connection, function(error){
            
            if(error == null || error === true){
              var res = connection.rawConnection.res;
              res.end(JSON.stringify({
                access_token: access_token,
                refresh_token: null,
              }));
            }
            
            next(connection, true);
          });
          
          next(connection, true);
        }
    
        next(connection, true);
      });
    }
  
    next(connection, true);
  });
};


OAuth2Provider.prototype.createRandomHash = function(len){
  len = len || 255;
  return crypto.randomBytes(len / 2).toString('hex');
}


module.exports = OAuth2Provider;