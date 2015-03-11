/**
 * ブラウザのショートカットキーの動作を抑制する。
 *
 * @param shortcutBlackList 止めたいショートカットキーのリスト ex... { 'Windows': {'IE9': ['Ctrl+C', 'Alt+Left'], 'Chrome':['F5', 'Ctrl+Pageup']}, 'Mac' : 'safari':{'Command+R'} }
 * @param callback 抑制対象に指定されたキーが入力された場合に実行されるコールバック関数。 この関数内でfalseを返せば、抑制を取りやめる（デフォルトの動作が実行される）。
 */
function disableBrowserShortcutKeys(shortcutBlackList, callback) {

    // TODO mac:safari対応・動作確認
    // TODO:全browserの共通キーを指定できるようにする
    var NON_ALPHABETIC_KEYCODE_MAP = {
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

    var BACKSPACE_EXCEPTIONAL_INPUT_TYPE = [
        'text',
        'password',
        'date',
        'datetime',
        'datetime-local',
        'email',
        'month',
        'number',
        'range',
        'search',
        'tel',
        'time',
        'url',
        'week'
    ];

    //コールバック関数の引数にするための、指定されたままの(toLowerCaseされていない)状態のブラウザ名とOS名
    var originalBrowserName;
    var originalOsName;

    /**
     * メイン関数
     * 指定されたショートカットキーの動作を抑制するイベントリスナーを、ウィンドウに追加する。
     */
    !function () {
        var nonParsedBlackList = selectBlackListForThisEnvironment(shortcutBlackList);
        if (nonParsedBlackList === undefined || nonParsedBlackList.length === 0) return;

        var parsedBlackList = new ShortcutBlackList(nonParsedBlackList);
        var eventListener = function (e) {
            //例外的なパターンを抑制対象から除外。テキストエリア内でのBackspaceなど。
            if(isExceptionalPattern(e)) return;

            var keyInfo = parsedBlackList.findKeyInfoByEvent(e);
            if (keyInfo == null) return;

            if (callback) {
                var isCanceled = callback(originalBrowserName, keyInfo.original, e) === false;
                if(isCanceled) return;
            }
            if (e.preventDefault) e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
            else e.returnValue = false;
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
        this.keyName = findMainKeyName(keys);
        this.ctrlKey = containsCtrl(keys);
        this.altKey = containsAlt(keys);
        this.shiftKey = containsShift(keys);
        this.metaKey = containsMeta(keys); //Mac's command key

        this.matchWithEvent = function(event){
            var keyCode = extractKeyCodeByEvent(event);
            return this.matchKeyByKeyCode(keyCode)
                && event.ctrlKey === this.ctrlKey
                && event.shiftKey === this.shiftKey
                && event.altKey === this.altKey
                && (event.metaKey === undefined || event.metaKey === this.metaKey)
        };

        this.matchKeyByKeyCode = function (keyCode){
            var keyName = convertKeyCodeToKeyName(keyCode);
            return keyName === this.keyName || (keyName instanceof Array && keyName.indexOf(this.keyName) !== -1)
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

        function findMainKeyName(keys){
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
     * @param nonParsedShortcuts
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

        for (var key in nonParsedShortcuts) if (nonParsedShortcuts.hasOwnProperty(key)){
            this.push(new KeyInfoToDisable(nonParsedShortcuts[key]));
        }
    }

    /**
     * イベントのターゲット要素を取得する。
     * @param event
     * @returns {string}
     */
    function getEventTargetElement(event) {
        var element;
        if (event.target) element = event.target;
        else if (event.srcElement) element = event.srcElement;
        if (element.nodeType == 3) element = element.parentNode;
        return element;
    }

    /**
     * 入力されたショートカットキーのリストから、
     * 実行中の環境のリストを選び出す。
     * @param shortcutsLists
     * @returns {*}
     */
    function selectBlackListForThisEnvironment(shortcutsLists) {
        var os = getOsName();
        var blackListForThisOs = selectBlackListForThisOs(shortcutsLists, os);
        var browser = getBrowserName();
        return selectBlackListForThisBrowser(blackListForThisOs, browser);
    }

    function selectBlackListForThisOs(shortcutsLists, os){
        for (var key in shortcutsLists) if(shortcutsLists.hasOwnProperty(key)) {
            if ((key + "").toLowerCase() === os) {
                originalOsName = key;
                return shortcutsLists[key];
            }
        }
    }

    function selectBlackListForThisBrowser(shortcutsLists, browser){
        for (var key in shortcutsLists) if(shortcutsLists.hasOwnProperty(key)) {
            if ((key + "").toLowerCase() === browser) {
                originalBrowserName = key;
                return shortcutsLists[key];
            }
        }
        return null;
    }

    /**
     * 実行中のブラウザ名を取得する。
     * @returns {string}
     */
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
     * 実行中のOS名を取得する。
     * @returns {string}
     */
    function getOsName(){
        if(window.navigator.userAgent.indexOf("Win") != -1 ){
            return 'win';
        }
        if(window.navigator.userAgent.indexOf("Mac") != -1 ){
            return 'mac'
        }
    }

    /**
     * キーコードを対応するキー名に変換する。
     * @param keyCode
     * @returns {string}
     */
    function convertKeyCodeToKeyName(keyCode) {
        if (NON_ALPHABETIC_KEYCODE_MAP[keyCode]) return NON_ALPHABETIC_KEYCODE_MAP[keyCode];
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

    /**
     * 抑制対象とすべきでないパターンかどうかを判定する。
     * 例：入力フォーム内でのBackspace
     * @param event
     * @returns {boolean}
     */
    function isExceptionalPattern(event){
        var keyCode = extractKeyCodeByEvent(event);
        var keyName = convertKeyCodeToKeyName(keyCode);
        var target = getEventTargetElement(event);
        if(keyName.indexOf('backspace') !== -1 ) {
            if(target.tagName === 'TEXTAREA' && target.readOnly == false) return true;
            //INPUTタグ内で入力された時は、　テキスト入力可能なタグでのみBackSpaceを有効にする(buttonなどは抑止)。
            if (target.tagName === 'INPUT' && target.readOnly == false && BACKSPACE_EXCEPTIONAL_INPUT_TYPE.indexOf(target.type) !== -1) return true;
        }else if(keyName.indexOf('enter') !== -1){
            if (target === 'TEXTAREA' && target.readOnly == false) return true;
        }
        return false;
    }
}
