/**
 * Created by Takuro on 2015/01/24.
 */
function disableBrowserShortcutKeys(shortcutsLists, callback) {

    // issues memo wrote by my native language.
    // TODO 特殊キーの複数パターン(exp. pgup,pageup,page_up)の入力に対応。
    // TODO keyInfoListあたりのクラスをきれいにする。
    // TODO targetがinput だった場合の処理分けをちゃんと整理する。disable時など
    // TODO mac:safari対応・動作確認
    // TODO:記号対策 shift+1は(shift+1, shift+!)とか複数パターンの書き方に対応する。
    // TODO:全browserの共通キーを指定できるようにする

    //Work around for stupid Shift key bug created by using lowercase - as a result the shift+num combination was broken
    var shift_nums = {
        "1":"!", "2":"\"", "3":"#", "4":"$", "5":"%", "6":"&", "7":"'", "8":"(", "9":")", "0":null,
        "-":"=",
        "^":"~",
        //"\\":"|",
        "@":"`",
        "[":"{",
        ";":"+",
        ":":"*",
        "]":"}",
        ",":"<",
        ".":">",
        "/":"?",
        "\\":"_"
    };

    var special_chars = {
        '186': ':',
        '187': ';',
        '188': ',',
        '189': '-',
        '190': '.',
        '191': '/',
        '192': '@',
        '219': '[',
        '220': '\\',
        '221': ']',
        '222': '^',
        '226': '_' //For backslash key. Japanese keyboards have two backslash key. So we need separate the symbol for them.
    };

    //Special Keys - and their codes
    // TODO: make work multiple pattern of special keys. Now, only first pattern works.
    var special_keys = {
        'esc':27,
        'escape':27,
        'tab':9,
        'space':32,
        'enter':13,
        'return':13,
        'backspace':8,

        'scrolllock':145,
        'scroll_lock':145,
        'scroll':145,
        'capslock':20,
        'caps_lock':20,
        'caps':20,
        'numlock':144,
        'num_lock':144,
        'num':144,

        'pause':19,
        'break':19,

        'insert':45,
        'home':36,
        'delete':46,
        'end':35,

        'pageup':33,
        'page_up':33,
        'pu':33,

        'pagedown':34,
        'page_down':34,
        'pd':34,

        '←':37,
        '↑':38,
        '→':39,
        '↓':40,

        'f1':112,
        'f2':113,
        'f3':114,
        'f4':115,
        'f5':116,
        'f6':117,
        'f7':118,
        'f8':119,
        'f9':120,
        'f10':121,
        'f11':122,
        'f12':123
    };

    /**
     * main method
     * set eventListener to prevent default operation.
     */
    !function() {
        var browserName = getBrowserName();
        var shortcuts = sortoutShortcutsListForThisBrowser(shortcutsLists, browserName);
        if (shortcuts == undefined || shortcuts.length == 0) return;

        var keyInfoList = new KeyInfoListToPrevent();
        for (var key in shortcuts) {
            keyInfoList.push(parseTarget(shortcuts[key]));
        }

        var eventListener = function (e) {
            var keyInfo = keyInfoList.match(e);
            if (keyInfo == null) return;

            var targetTag = getTargetTag(e);
            switch(keyInfo.mainKey){
                case "backspace":
                    //TODO: sort out when input type="text"
                    //TODO: it includes bugs when input attribute is disable? Check it
                    if(targetTag == 'INPUT' || targetTag == 'TEXTAREA')return;
                    break;
                case "enter":
                    if(targetTag == 'TEXTAREA')return;
                    break;
            }

            if (e.preventDefault) e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
            else e.returnValue = false;
            if(callback) callback(browserName, keyInfo.original, e); //TODO; set browserName in original format. Now, it's set after called toLowerCase();
            return false;
        };

        if (window.addEventListener) window.addEventListener('keydown', eventListener, false);
        else if (window.attachEvent) window.attachEvent('onkeydown', eventListener);
        else window['onkeydown'] = func;
    }();

    /**
     * かなりイケてない。
     * parseTargetは内包して、
     * コンストラクタでshortcutを受け取って、parseTargetして自分に値をセットすべき。
     * @param mainKey exp. "a", "+", "F1", "Esc", "Tab", "Backspace", or "Up"
     * @param subKeys the keys information pressed with.  { ctrlKey; Boolean, altKey: Boolean, shiftKey: Boolean, metaKey; Boolean}
     * @param numOfKeyPress number of keys to expected
     * @constructor
     */
    function KeyInfoToPrevent(){
        this.original = '';
        this.mainKey = '';
        this.ctrlKey = false;
        this.altKey = false;
        this.shiftKey = false;
        this.metaKey = false; //Mac's command key
    }

    /**
     * クラス設計がイケてない感じ。KeyInfoToPreventは内包していい気がする。
     * @constructor
     */
    function KeyInfoListToPrevent(){
        this.keyInfoList = [];
        this.push = function(shortcut){
            if(shortcut instanceof KeyInfoToPrevent == false) return;
            this.keyInfoList.push(shortcut);
        };
        this.match = function(event){
            var mainKeyPressed = generateStringOfPressedKey(event).toLowerCase();
            for(var i in this.keyInfoList){
                if( this.keyInfoList.hasOwnProperty(i)
                    && this.keyInfoList[i] instanceof KeyInfoToPrevent
                    && mainKeyPressed == this.keyInfoList[i].mainKey
                    && event.ctrlKey == this.keyInfoList[i].ctrlKey
                    && event.shiftKey == this.keyInfoList[i].shiftKey
                    && event.altKey == this.keyInfoList[i].altKey
                    && (event.metaKey === undefined || event.metaKey == this.keyInfoList[i].metaKey)) {
                    return this.keyInfoList[i];
                }
            }
            return null;
        }
    }

    /**
     * get target element's name of event.
     * @param event
     * @returns {string}
     */
    function getTargetTag(event){
        var element;
        if(event.target) element=event.target;
        else if(event.srcElement) element=event.srcElement;
        if(element.nodeType==3) element=element.parentNode;
        return element.tagName;
    }

    /**
     *
     * @param shortcutsLists
     * @param browserName
     * @returns {*}
     */
    function sortoutShortcutsListForThisBrowser(shortcutsLists, browserName){
        for( var key in shortcutsLists ){
            if( (key + "").toLowerCase() == browserName) return shortcutsLists[key];
        }
        return undefined;
    }

    function getBrowserName(){
        var userAgent = window.navigator.userAgent.toLowerCase(),
            appVersion = window.navigator.appVersion.toLowerCase(),
            browserName;
        if (userAgent.indexOf('msie') != -1) {
            if (appVersion.indexOf('msie 9.') != -1) {
                browserName = 'ie9';
            } else if (appVersion.indexOf('msie 10.') != -1) {
                browserName = 'ie10';
            }
        } else if (userAgent.indexOf('chrome') != -1) {
            browserName = 'chrome';
        } else if (userAgent.indexOf('firefox') != -1){
            browserName = 'firefox';
        } else if (userAgent.indexOf('safari') != -1){
            browserName = 'safari';
        }
        return browserName;
    }

    /**
     * //FIXME Incomplete when the special character(exp. "+", "*", "{" ) is pressed.
     * @param keyCode
     * @returns {string}
     */
    function generateStringOfPressedKey(event){
        var code;
        if (event.keyCode) code = event.keyCode;
        else if (event.which) code = event.which;
        for(var key in special_keys){
            if(special_keys[key] === code) return key +"";
        }
        if(special_chars[code] != undefined) return special_chars[code];
        var character = String.fromCharCode(code).toLowerCase();
        if(shift_nums[character] && event.shiftKey) //Stupid Shift key bug created by using lowercase
            return shift_nums[character];
        return character;
    }

    /**
     * parse the shortcut string to KeyInfoToPrevent
     * @param shortcut
     * @returns {disableBrowserShortcutKeys.KeyInfoToPrevent}
     */
    function parseTarget(shortcut){
        var keys = shortcut.toLowerCase().split("+");

        var keyInfo = new KeyInfoToPrevent();
        keyInfo.original = shortcut;
        for( var k in keys) {
            var key = keys[k];
            switch (key) {
                case "ctrl":
                case "control":
                    keyInfo.ctrlKey = true;
                    break;
                case "shift":
                    keyInfo.shiftKey = true;
                    break;
                case "alt":
                case "option":
                case "⌥":
                    keyInfo.altKey = true;
                    break;
                case "meta":
                case "command":
                case "⌘":
                    keyInfo.metaKey = true;
                    break;
                default :
                    if (key.length > 1) { //If it is a special key
                        if (special_keys[key] != undefined) keyInfo.mainKey = key;
                        else throw new Error('Unknown key is assigned. : ' + key);
                    } else { //The special keys did not match
                        keyInfo.mainKey = key;
                    }
                    break;
            }
        }
        return keyInfo;
    }
}
