/**
 * ブラウザのショートカットキーの動作を抑制する。
 *
 * @param shortcutBlackList 止めたいショートカットキーのリスト ex... { 'Windows': {'IE9': ['Ctrl+C', 'Alt+Left'], 'Chrome':['F5', 'Ctrl+Pageup']}, 'Mac' : 'safari':{'Command+R'} }
 * @param callback 抑制対象に指定されたキーが入力された場合に実行されるコールバック関数。 この関数内でfalseを返せば、抑制を取りやめる（デフォルトの動作が実行される）。
 */
function disableBrowserShortcutKeys(shortcutBlackList, callback) {

    var MODIFIER_KEYS_CODE_MAP = {
        16 : ['shift', '⇧'],
        17 : ['ctrl', 'control', '⌃'],
        18 : ['alt', 'option', '⌥'],
        91 : ['meta', 'command', '⌘']
    };

    var NON_ALPHABETIC_KEYS_CODE_MAP = {
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
        27: ['esc', 'escape'],
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

    /**
     * inputタグのtypeの中でも、backspaceを抑制しないもの。
     * @type {string[]}
     */
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

    /**
     * パース後の抑止対象リストを格納するオブジェクト
     * @param nonParsedShortcuts
     * @constructor
     */
    function ShortcutBlackList(nonParsedShortcuts) {
        this.blackList = [];
        for (var key in nonParsedShortcuts) if (nonParsedShortcuts.hasOwnProperty(key)){
            this.blackList.push(new KeyCombinationInfo(nonParsedShortcuts[key]));
        }
    }

    /**
     * onkeydownのイベントオブジェクト一致するキー情報を返却する。
     * 無ければnullを返却する。
     * @param event
     * @returns {*}
     */
    ShortcutBlackList.prototype.findKeyInfoByEvent = function(event){
            for (var i in this.blackList) if (this.blackList.hasOwnProperty(i)){
                if(this.blackList[i].matchWithEvent(event)) return this.blackList[i];
            }
            return null;
    };

    /**
     * パース後のキーの組み合わせ情報を格納するオブジェクト
     * @param nonParsedShortcut
     * @constructor
     */
    function KeyCombinationInfo(nonParsedShortcut) {
        this.original = nonParsedShortcut;

        var keys = nonParsedShortcut.toLowerCase().split("+");
        this.keyName = keys[keys.length - 1]; // 末尾に指定されたキーをメインキーとする。
        this.shiftKey = containsShift(keys);
        this.ctrlKey = containsCtrl(keys);
        this.altKey = containsAlt(keys);
        this.metaKey = containsMeta(keys); //Mac's command key

        function containsShift (keys){
            return haveCommonValue(keys, MODIFIER_KEYS_CODE_MAP[16]);
        }

        function containsCtrl(keys){
            return haveCommonValue(keys, MODIFIER_KEYS_CODE_MAP[17]);
        }

        function containsAlt(keys){
           return haveCommonValue(keys, MODIFIER_KEYS_CODE_MAP[18]);
        }

        function containsMeta (keys){
            return haveCommonValue(keys, MODIFIER_KEYS_CODE_MAP[91]);
        }

        function haveCommonValue (array1, array2){
            for(var key in array1) if(array1.hasOwnProperty(key)){
                if(array2.indexOf(array1[key]) !== -1) return true;
            }
            return false;
        }
    }

    /**
     * マッチするキー情報が
     * @param keyCode
     * @returns {boolean}
     */
    KeyCombinationInfo.prototype.matchKeyByKeyCode = function (keyCode){
            var keyName = convertKeyCodeToKeyName(keyCode);
            return keyName === this.keyName || (keyName instanceof Array && keyName.indexOf(this.keyName) !== -1)
    };

    /**
     *
     * @param event
     * @returns {boolean}
     */
    KeyCombinationInfo.prototype.matchWithEvent = function(event){
        var keyCode = extractKeyCodeInEvent(event);
        return this.matchKeyByKeyCode(keyCode)
            && event.ctrlKey === this.ctrlKey
            && event.shiftKey === this.shiftKey
            && event.altKey === this.altKey
            && (event.metaKey === undefined || event.metaKey === this.metaKey)
    };

    //コールバック関数の引数にするための、指定されたままの(toLowerCaseされていない)状態のブラウザ名とOS名。
    var originalBrowserName;
    var originalOsName;

    /**
     * メイン関数
     * 指定されたショートカットキーの動作を抑制するイベントリスナーを、ウィンドウに追加する。
     */
    !function () {
        var nonParsedBlackList = selectBlackListForThisEnvironment(shortcutBlackList);
        if ( !nonParsedBlackList || nonParsedBlackList.length === 0) return;

        var parsedBlackList = new ShortcutBlackList(nonParsedBlackList);
        var eventListener = function (e) {
            //例外的なパターンの場合、抑制しない。テキストエリア内でのBackspaceなど。
            if(isExceptionalPattern(e)) return;

            var keyInfo = parsedBlackList.findKeyInfoByEvent(e);
            if (keyInfo == null) return;

            if (callback) {
                var isCanceled = callback(originalBrowserName, keyInfo.original, e) === false;
                if(isCanceled) return;
            }
            if (e.preventDefault) e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
            e.returnValue = false;
            if(window.event) {
                window.event.keyCode = 37; //It's dark magic. In IE it required to disable Alt+C, Alt+F4 or any other key combinations.
                window.event.returnValue = false;
                if(window.event.preventDefault) window.event.preventDefault();
                if(window.event.stopPropagation) window.event.stopPropagation();
            }
            return false;
        };

        if (window.addEventListener) window.addEventListener('keydown', eventListener, false);
        else if (window.attachEvent) window.attachEvent('onkeydown', eventListener);
        else window['onkeydown'] = eventListener;

        //IEのF1対応 F1を押すと、onkeydownとは別にonhelpイベントが走る。
        if(getBrowserName().indexOf('ie') !== -1 && (nonParsedBlackList.indexOf('F1') !== -1 || nonParsedBlackList.indexOf('f1') !== -1)){
            window.document.onhelp = function () {
                window.event.returnValue = false;
            };
        }
    }();

    /**
     * パース前のショートカットキーのリストから、
     * 実行中の環境のリストを選び出す。
     * @param shortcutsLists
     * @returns {*}
     */
    function selectBlackListForThisEnvironment(shortcutsLists) {
        var blackListForThisOs = selectBlackListForThisOs(shortcutsLists);
        var browser = getBrowserName();
        return selectBlackListForThisBrowser(blackListForThisOs, browser);
    }

    /**
     * パース前のショートカットキー抑制対象のリストから、実行環境のOS用の情報を取り出す。
     * @param shortcutsLists
     * @returns {*}
     */
    function selectBlackListForThisOs(shortcutsLists){
        var osNamePatterns;
        if(isWindows()) osNamePatterns = ['win', 'windows'];
        else if(isMac()) osNamePatterns = ['mac', 'macintosh'];
        else return null;

        for (var key in shortcutsLists) if(shortcutsLists.hasOwnProperty(key)) {
            if (osNamePatterns.indexOf(key.toLowerCase()) !== -1) {
                originalOsName = key;
                return shortcutsLists[key];
            }
        }
    }

    /**
     * パース前のショートカットキー抑制対象のリストから、実行環境のブラウザ用の情報を取り出す。
     * @param shortcutsLists
     * @param browser
     * @returns {*}
     */
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
            } else if (appVersion.indexOf('rv:11') != -1) {
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
     * 実行環境がWindowsかどうかを判定
     * @returns {boolean}
     */
    function isWindows(){
        return window.navigator.userAgent.indexOf('Win') !== -1;
    }

    /**
     * 実行環境がMacかどうかを判定
     * @returns {boolean}
     */
    function isMac(){
        return window.navigator.userAgent.indexOf('Mac') != -1;
    }

    /**
     * イベントが抑制対象とすべきでないパターンかどうかを判定する。
     * 例：入力フォーム内でのBackspace
     * @param event
     * @returns {boolean}
     */
    function isExceptionalPattern(event){
        var keyCode = extractKeyCodeInEvent(event);
        var keyName = convertKeyCodeToKeyName(keyCode);
        var target = getEventTargetElement(event);
        if(keyName.indexOf('backspace') !== -1 ) {
            if(target.tagName === 'TEXTAREA' && target.readOnly == false) return true;
            //INPUTタグ内で入力された時は、　テキスト入力可能なタグでのみBackSpaceを有効にする(buttonなどは抑止)。
            if (target.tagName === 'INPUT' && target.readOnly == false && BACKSPACE_EXCEPTIONAL_INPUT_TYPE.indexOf(target.type) !== -1) return true;
        }else if(keyName.indexOf('enter') !== -1){
            if (target.tagName === 'TEXTAREA' && target.readOnly == false) return true;
        }
        return false;
    }

    /**
     * イベントオブジェクトからキーコードを抽出する。
     * @param event
     * @returns {*}
     */
    function extractKeyCodeInEvent(event) {
        if(event.keyCode) return event.keyCode;
        else if(event.which) return event.which;
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
     * キーコードを対応するキー名に変換する。
     * @param keyCode
     * @returns {string}
     */
    function convertKeyCodeToKeyName(keyCode) {
        if (NON_ALPHABETIC_KEYS_CODE_MAP[keyCode]) return NON_ALPHABETIC_KEYS_CODE_MAP[keyCode];
        if (MODIFIER_KEYS_CODE_MAP[keyCode]) return MODIFIER_KEYS_CODE_MAP[keyCode];
        return String.fromCharCode(keyCode).toLowerCase();
    }
}
