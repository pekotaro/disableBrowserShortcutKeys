# disableBrowserShortcutKeys
ブラウザのショートカットキーを動作させないようにする。  

エンタープライズ分野ではブラウザのショートカットキーを抑止する需要があるらしい。  
既存のソースコードをもらったがkeyCodeによる指定が読みづらいし抑止キーをブラウザごとに設定できなかったりだったので自分で作ってみた。  
業務時間中にやると、無駄な工数をかけるなとか言われそうなので自宅で作成。  
何度も同じことをやりたくないのでここに上げる。  

# Usage

```js
disableBrowserShortcutKeys({  
	'ie10' : [  
		'F5',  
		'Ctrl+C',  
		'F12'  
	],  
	'firefox':[  
		'F5',  
		'Ctrl+C',  
		'Ctrl+Shift+I',  
		'Ctrl+Shift+K'  
	]
});  
```

## Shortcut Keys Reference
IE9  
http://windows.microsoft.com/ja-jp/internet-explorer/ie-keyboard-shortcuts#ie=ie-9  
IE10  
http://windows.microsoft.com/ja-jp/internet-explorer/ie-keyboard-shortcuts#ie=ie-10  
Chrome  
https://support.google.com/chrome/answer/157179?hl=ja  
Firefox  
https://support.mozilla.org/ja/kb/keyboard-shortcuts-perform-firefox-tasks-quickly  


## Callback function
You can set callback function to second parameter.
```js
disableBrowserShortcutKeys({  
	'ie10' : [  
		'F5',  
		'Ctrl+C',  
		'F12'  
	]
},function(){
    alert('Disable shortcut is pressed.');
});  
```
