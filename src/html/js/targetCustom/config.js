$.get('/config')
.done(function(config){
    $('#spo-settings-url').html(config.SPO_URL);
    $('#spo-settings-tenant').html(config.SPO_TENANT);
    $('#spo-settings-user').html(config.SPO_USER);
});