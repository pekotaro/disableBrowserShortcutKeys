/**
 * Created by Takuro on 2015/01/24.
 */
function disableBrowserShortcutKeys(shortcutBlackList, callback) {

    // issues memo wrote by my native language.
    // TODO targetがinput だった場合の処理分けをちゃんと整理する。disable時など
    // TODO mac:safari対応・動作確認
    // TODO:記号対策 shift+1は(shift+1, shift+!)とか複数パターンの書き方に対応する。
    // TODO:全browserの共通キーを指定できるようにする

    //Special Keys - and their codes
    // TODO: make work multiple pattern of special keys. Now, only first pattern works.
    var nonAlphabetics_keys = {
        186: ':',
        187: ';',
        188: ',',
        189: '-',
        190: '.',
        191: '/',
        192: '@',
        219: '[',
        220: '\\',
        221: ']',
        222: '^',
        226: '_',//For second backslash key. Japanese keyboards have two backslash key. So we need separate the symbol for them.
        27: ['esc', "escape"],
        9: 'tab',
        32: 'space',
        13: ['enter', 'return'],
        8: ['backspace', 'bs'],
        145: ['scrolllock', 'scroll_lock', 'scroll'],
        20: ['capslock', 'caps_lock', 'caps'],
        144: ['numlock', 'num_lock', 'num'],
        19: ['pause', 'break'],

        45: 'insert',
        36: 'home',
        46: 'delete',
        35: 'end',

        33: ['pageup', 'page_up', 'pu'],
        34: ['pagedown', 'page_down', 'pd'],

        37: ['←', 'left'],
        38: ['↑', 'up'],
        39: ['→', 'right'],
        40: ['↓', 'down'],

        112: 'f1',
        113: 'f2',
        114: 'f3',
        115: 'f4',
        116: 'f5',
        117: 'f6',
        118: 'f7',
        119: 'f8',
        120: 'f9',
        121: 'f10',
        122: 'f11',
        123: 'f12'
    };

    var MODIFIER_KEYS_NAMES = {
        ctrlKey : ['ctrl', 'control', '⌃'],
        altKey : ['alt', 'option', '⌥'],
        shiftKey : ['shift', '⇧'],
        metaKey : ['meta', 'command', '⌘']
    };

    var originalBrowserName;

    /**
     * main method
     * set eventListener to prevent default operation.
     */
    !function () {
        var browserName = getBrowserName();
        var nonParsedBlackList = selectBlackListForThisBrowser(shortcutBlackList, browserName);
        if (nonParsedBlackList == undefined || nonParsedBlackList.length == 0) return;

        var parsedBlackList = new ShortcutBlackList(nonParsedBlackList);
        var eventListener = function (e) {

            var keyInfo = parsedBlackList.findKeyInfoByEvent(e);
            if (keyInfo == null) return;

            var targetTagName = getEventTargetTagName(e);
            switch (keyInfo.mainKey) {
                case "backspace":
                    if (targetTagName == 'INPUT' || targetTagName == 'TEXTAREA')return;
                    break;
                case "enter":
                    if (targetTagName == 'TEXTAREA')return;
                    break;
            }

            if (e.preventDefault) e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
            else e.returnValue = false;
            if (callback) callback(originalBrowserName, keyInfo.original, e);
            return false;
        };

        if (window.addEventListener) window.addEventListener('keydown', eventListener, false);
        else if (window.attachEvent) window.attachEvent('onkeydown', eventListener);
        else window['onkeydown'] = eventListener;
    }();

    /**
     * キー情報
     * TODO: メソッドのprototype化
     * @param nonParsedShortcut
     * @constructor
     */
    function KeyInfoToDisable(nonParsedShortcut) {

        this.original = nonParsedShortcut;

        var keys = nonParsedShortcut.toLowerCase().split("+");
        this.mainKey = findMainKey(keys);
        this.ctrlKey = containsCtrl(keys);
        this.altKey = containsAlt(keys);
        this.shiftKey = containsShift(keys);
        this.metaKey = containsMeta(keys); //Mac's command key

        this.matchWithEvent = function(event){
            var keyCode = extractKeyCodeByEvent(event);
            var pressedKeyName = convertKeyCodeToKeyName(keyCode);
            return ((pressedKeyName === this.mainKey || (pressedKeyName instanceof Array && pressedKeyName.indexOf(this.mainKey) != -1))
                && event.ctrlKey == this.ctrlKey
                && event.shiftKey == this.shiftKey
                && event.altKey == this.altKey
                && (event.metaKey === undefined || event.metaKey == this.metaKey))
        };

        function containsCtrl(keys){
            return haveCommonValue(keys, MODIFIER_KEYS_NAMES.ctrlKey);
        }

        function containsAlt(keys){
            return haveCommonValue(keys, MODIFIER_KEYS_NAMES.altKey);
        }

        function containsShift(keys){
            return haveCommonValue(keys, MODIFIER_KEYS_NAMES.shiftKey);
        }

        function containsMeta(keys){
            return haveCommonValue(keys, MODIFIER_KEYS_NAMES.metaKey);
        }

        function haveCommonValue(array1, array2){
            for(var key in array1) if(array1.hasOwnProperty(key)){
                if(array2.indexOf(array1[key]) !== -1) return true;
            }
            return false;
        }

        function findMainKey(keys){
            for(var k in keys)if( keys.hasOwnProperty(k)){
                if(!isModifierKey(keys[k])) return keys[k];
            }
            return null;
        }

        function isModifierKey(key){
            for(var k in MODIFIER_KEYS_NAMES )if( MODIFIER_KEYS_NAMES.hasOwnProperty(k)){
                if(MODIFIER_KEYS_NAMES[k].indexOf(key) !== -1) return true;
            }
            return false;
        }
    }

    /**
     * ショートカットキーの抑止対象リスト
     * @constructor
     */
    function ShortcutBlackList(nonParsedShortcuts) {
        this.blackList = [];

        this.push = function (keyInfo) {
            if(keyInfo instanceof KeyInfoToDisable == false) throw new Error("Parameter must be Instance of KeyInfoToDisable");
            this.blackList.push(keyInfo);
        };

        this.findKeyInfoByEvent = function (event) {
            for (var i in this.blackList) if (this.blackList.hasOwnProperty(i)){
                if(this.blackList[i].matchWithEvent(event)) return this.blackList[i];
            }
            return null;
        };
        for (var key in nonParsedShortcuts) {
            this.push(new KeyInfoToDisable(nonParsedShortcuts[key]));
        }
    }

    /**
     * get target element's name of event.
     * @param event
     * @returns {string}
     */
    function getEventTargetTagName(event) {
        var element;
        if (event.target) element = event.target;
        else if (event.srcElement) element = event.srcElement;
        if (element.nodeType == 3) element = element.parentNode;
        return element.tagName;
    }

    /**
     *
     * @param shortcutsLists
     * @param browserName
     * @returns {*}
     */
    function selectBlackListForThisBrowser(shortcutsLists, browserName) {
        for (var key in shortcutsLists) {
            if ((key + "").toLowerCase() == browserName) {
                originalBrowserName = key;
                return shortcutsLists[key];
            }
        }
        return null;
    }

    function getBrowserName() {
        var userAgent = window.navigator.userAgent.toLowerCase(),
            appVersion = window.navigator.appVersion.toLowerCase();
        if (userAgent.indexOf('msie') != -1) {
            if (appVersion.indexOf('msie 9.') != -1) {
                return 'ie9';
            } else if (appVersion.indexOf('msie 10.') != -1) {
                return 'ie10';
            } else if (appVersion.indexOf('msie 11.') != -1) {
                return 'ie11';
            }
        } else if (userAgent.indexOf('chrome') != -1) {
            return'chrome';
        } else if (userAgent.indexOf('firefox') != -1) {
            return 'firefox';
        } else if (userAgent.indexOf('safari') != -1) {
            return 'safari';
        }
    }

    /**
     * キーコードを。対応するキー名に変換する。
     * @param keyCode
     * @returns {string}
     */
    function convertKeyCodeToKeyName(keyCode) {
        if (nonAlphabetics_keys[keyCode]) return nonAlphabetics_keys[keyCode];
        return String.fromCharCode(keyCode).toLowerCase();
    }

    /**
     * イベントオブジェクトからキーコードを抽出する。
     * @param event
     * @returns {*}
     */
    function extractKeyCodeByEvent(event) {
        if(event.keyCode) return event.keyCode;
        else if(event.which) return event.which;
    }
}
