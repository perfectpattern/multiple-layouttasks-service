function initNavigation(el){

    //remove all "wrong-language" items from header. E.g. if lan==de, remove all lan=en items.
    el.find("*").each(function(){
        var attr = $(this).attr('lan');
        if (typeof attr !== typeof undefined && attr !== false)
            if(attr != lan)
                $(this).remove();
    })

    //change link language
    $('#logo-link').attr("href", "/" + lan +  "/home")

    //init msgBar
    msgBar = new MsgBar($('#msgBar'));
    
    //insert the right url in language changer to stay on same side when changing language
    //$('.header-menu-language-changer a').attr("href", '/' + lan + '/' + target);

    //get version of flow
    $.get('/version').done(data => {
        $('.header-title-text > span').html(data.versionNumber);
        $('.header-title-text > span').attr("title", "pib-flow version");
    })

    //set calculation URL
    $.get('/config')
    .done(config => {
            $('.console-link').attr("href", "https://" + config.SPO_URL.replace("spo-v3.web-apps.", "") + "/sPrint.one.cockpit.v2.webClient/current/#schedule");
    });

    
    //Main menu mechanics: Activate
    $('#activate-mainmenu').click(function(){
        $('#menu').addClass("visible");
        $('.header-menu-active-layer').fadeIn(600);
    });

    //Main menu mechanics: Deactivate
    $('#deactivate-mainmenu').click(function(){
        $('#menu').removeClass("visible");
        $('.header-menu-active-layer').fadeOut(600);
    });		

    $('.header-menu-item.' + target + ' a').addClass("selected");
    $('.quick-menu-item.' + target).addClass("selected");
    if(target == undefined) $('#quick-menu').hide();
}