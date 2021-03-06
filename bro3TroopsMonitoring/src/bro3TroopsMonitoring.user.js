//////////////////////
// ==UserScript==
// @name		南蛮集計ツール
// @namespace   南蛮集計ツール
// @description	ブラウザ三国志 南蛮出兵をカウントする（監視）ツール♥
// @include		*://w*.3gokushi.jp/alliance/detail.php*
// @include		*://w*.3gokushi.jp/report/detail.php*
// @connect		3gokushi.jp
// @author      みどり
// @updateURL	//https://github.com/MIDORI-bro3/bro3tools/blob/master/bro3TroopsMonitoring/src/bro3TroopsMonitoring.user.js
// @grant none
// @grant GM_setValue
// @grant GM_getValue
// @grant GM_getResourceText
// @require	https://code.jquery.com/jquery-2.1.4.min.js
// @require	https://code.jquery.com/ui/1.11.4/jquery-ui.min.js
// @resource	jqueryui_css	http://ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/themes/smoothness/jquery-ui.css
// @version 	0.0.2
// ==================
// 2021.05.23	0.0.0  配布初期バージョン
// 2021.08.20   0.0.1　バグ修正：詳細で重盾タグが抜けていた
// 2021.08.20   0.0.2　砦座標情報収集機能の追加
// ==/UserScript==
var VERSION = "0.0.2";

var HOST = location.hostname;
var $ = window.jQuery;//OR
window.jQuery.noConflict();

//----------------------------------------------------------------------
// グローバル変数群
//----------------------------------------------------------------------
// オプション設定管理用
var g_helper_options;

// 南蛮ホストユーザ名
var hostName = "";//"みどり";
//GasアプリURL(未実装
var gasUrl = '';
//その他スプシ関連項目
var attackerKey = '攻略者'
//GM用タグ？
var scriptName = "TroopsMonitoring";
//----------------------------------------------------------------------
// 画面設定項目-保存フィールド名対応定数群
//----------------------------------------------------------------------
// 共通タブ
//var SIEGEHELPER_01 = 'sh01';		// ユーザー名

//----------------------------------------------------------------------
// スクリプト全体で共有する固有定義
//----------------------------------------------------------------------
var SERVER_SCHEME = location.protocol + "//";
var BASE_URL = SERVER_SCHEME + location.hostname;
var SERVER_NAME = location.hostname.match(/^(.*)\.3gokushi/)[1];
var SORT_UP_ICON = BASE_URL + "/20160427-03/extend_project/w945/img/trade/icon_up.gif";
var SORT_DOWN_ICON = BASE_URL + "/20160427-03/extend_project/w945/img/trade/icon_down.gif";

//----------------------------------------------------------------------
// メイン処理
//----------------------------------------------------------------------
(function() {
    // Your code here...
//////
    // 広告iframe内で呼び出された場合は無視
	if (!$("#container").length) { return; }
	// 歴史書モードの場合は無視
	if ($("#sidebar img[title=歴史書]").length){ return; }

    //南蛮ログかチェックする
    // ホスト名を取得
    hostName = ($('.brno a:nth-child(2)').text()).replace(/\s+/g, "");
    //alert(hostName);
    var checkNanban = $("td:contains('南蛮兵　に攻撃されました')").length;
    if( 0 == checkNanban ){
        //alert("南蛮ログじゃないよ");
        return;
    }
    //件名テーブルの後ろに追加
    //ボタン4(隣接報告)
    $('table[summary="件名"]').after("<button id='troops_button_4' disabled=false >ボタン4</button>");
    //ボタン3(砦情報収集))
    $('table[summary="件名"]').after("<button id='troops_button_collectBase' disabled=false >集計(砦:ざっくり)</button>");
    //ボタン2(集計：詳細)
    $('table[summary="件名"]').after("<button id='troops_button_collectdetail' disabled=false>集計(人:詳細)</button>");
    //ボタン1(集計)
    $('table[summary="件名"]').after("<button id='troops_button_collect' disabled=false>集計(人:ざっくり)</button>");
    //情報表示用テキストボックス
    $('table[summary="件名"]').after("<div><p>TroopsMonitoring</p></div><div style='margin-left: 4px;'><textarea id='troops_outtext' cols='40' rows='1' style='overflow: margin: 4px; '></textarea></div>");


    //ボタンクリックで動作するイベントを設定
    $('#troops_button_collect').on('click',function(){collection_troopsData();});
    $('#troops_button_collectdetail').on('click',function(){collection_troopsDataALL();});
    $('#troops_button_collectBase').on('click',function(){collection_troopsBase();});
    //$('#troops_button_4').on('click',function(){report_adjecent();});

    //援軍数
    var troopsNum = $('table[summary="防御者"]').has('th[class = "defenser"]').length;
    $("#troops_outtext").val( "部隊数=" + troopsNum + "\n" );
    if( 0 == troopsNum){
        return;
    }

    // ボタンを有効にする
    botton_on();


    //ボタンを無効にする
    function botton_off(){
        document.getElementById('troops_button_collect').disabled=true;
        document.getElementById('troops_button_collectdetail').disabled=true;
        document.getElementById('troops_button_collectBase').disabled=true;
    }
    // ボタンを有効にする
    function botton_on(){
        document.getElementById('troops_button_collect').disabled=false;
        document.getElementById('troops_button_collectdetail').disabled=false;
        document.getElementById('troops_button_collectBase').disabled=false;
    }

    function get_troopsData(troopsData){
        // データ読み込みループ
        for(var i=0; i < troopsNum; i++ ){
            //ユーザネームを取得
            var userName = $('th[class = "defenserBase"]').eq(i).children('a').eq(1).text();
            // 拠点URL取得
            var kyotenURL = $('th[class = "defenserBase"]').eq(i).children('a').eq(2).attr('href');
            var busyo = 0; // 武将数
            var lowerSword = 0;//剣兵
            var lowerShielder = 0;//盾兵
            var lowerLancer = 0;//槍兵
            var lowerArcher = 0;//弓兵
            var lowerRider = 0;//騎兵
            var lowerCar = 0;//衝車
            var lowerScouter = 0;//斥候
            var highSword = 0;//大剣兵
            var highShilder = 0;//重盾兵
            var highLancer = 0;//矛槍兵
            var highArcher = 0;//弩兵
            var highRider = 0;//近衛騎兵
            var highCar = 0;//投石機
            var highScouter = 0;//斥候騎兵
            var eliteAxSoldier = 0;//斧兵
            var eliteTwinSwordSoldier = 0;//双剣兵
            var eliteHammerSoldier = 0;//大錘兵

            // 頭の悪いソース何とかしたい。
            lowerSword = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(2).children('td').eq(0).text());//剣兵
            lowerShielder = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(2).children('td').eq(1).text());//盾兵
            lowerLancer = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(2).children('td').eq(2).text());//槍兵
            lowerArcher = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(2).children('td').eq(3).text());//弓兵
            lowerRider = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(2).children('td').eq(4).text());//騎兵
            lowerCar = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(2).children('td').eq(5).text());//衝車
            lowerScouter = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(2).children('td').eq(6).text());//斥候
            highSword = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(5).children('td').eq(0).text());//大剣兵
            highShilder = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(5).children('td').eq(1).text());//重盾兵
            highLancer = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(5).children('td').eq(2).text());//矛槍兵
            highArcher = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(5).children('td').eq(3).text());//弩兵
            highRider = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(5).children('td').eq(4).text());//近衛騎兵
            highCar = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(5).children('td').eq(5).text());//投石
            highScouter = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(5).children('td').eq(6).text());//斥候騎兵
            eliteAxSoldier = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(8).children('td').eq(0).text());//戦斧
            eliteTwinSwordSoldier = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(8).children('td').eq(1).text());//双剣兵
            eliteHammerSoldier = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(8).children('td').eq(2).text());//大錘兵
            busyo = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(8).children('td').eq(6).text());//武将
            var userAllData = {
                userName:userName,
                kyotenURL:kyotenURL,
                busyo:busyo,
                lowerSword:lowerSword,
                lowerShielder:lowerShielder,
                lowerLancer:lowerLancer,
                lowerArcher:lowerArcher,
                lowerRider:lowerRider,
                lowerCar:lowerCar,
                lowerScouter:lowerScouter,
                highSword:highSword,
                highShilder:highShilder,
                highLancer:highLancer,
                highArcher:highArcher,
                highRider:highRider,
                highCar:highCar,
                highScouter:highScouter,
                eliteAxSoldier:eliteAxSoldier,
                eliteTwinSwordSoldier:eliteTwinSwordSoldier,
                eliteHammerSoldier:eliteHammerSoldier
            };
            troopsData.push(userAllData);
        }
    }


    function cellection_troopsDataAll(troopsData){
        // データ読み込みループ
        for(var i=0; i < troopsNum; i++ ){
            //ユーザネームを取得
            var userName = $('th[class = "defenserBase"]').eq(i).children('a').eq(1).text();
            var lowerSword = 0;//剣兵
            var lowerShielder = 0;//盾兵
            var lowerLancer = 0;//槍兵
            var lowerArcher = 0;//弓兵
            var lowerRider = 0;//騎兵
            var lowerCar = 0;//衝車
            var lowerScouter = 0;//斥候
            var highSword = 0;//大剣兵
            var highShilder = 0;//重盾兵
            var highLancer = 0;//矛槍兵
            var highArcher = 0;//弩兵
            var highRider = 0;//近衛騎兵
            var highCar = 0;//投石機
            var highScouter = 0;//斥候騎兵
            var eliteAxSoldier = 0;//斧兵
            var eliteTwinSwordSoldier = 0;//双剣兵
            var eliteHammerSoldier = 0;//大錘兵
            var lowerNum = 0;
            var higherNum = 0;
            var highShilderNum = 0;
            var eliteNum = 0;
            // 頭の悪いソース何とかしたい。
            lowerSword = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(2).children('td').eq(0).text());//剣兵
            lowerShielder = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(2).children('td').eq(1).text());//盾兵
            lowerLancer = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(2).children('td').eq(2).text());//槍兵
            lowerArcher = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(2).children('td').eq(3).text());//弓兵
            lowerRider = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(2).children('td').eq(4).text());//騎兵
            lowerCar = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(2).children('td').eq(5).text());//衝車
            lowerScouter = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(2).children('td').eq(6).text());//斥候
            highSword = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(5).children('td').eq(0).text());//大剣兵
            highShilder = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(5).children('td').eq(1).text());//重盾兵
            highLancer = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(5).children('td').eq(2).text());//矛槍兵
            highArcher = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(5).children('td').eq(3).text());//弩兵
            highRider = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(5).children('td').eq(4).text());//近衛騎兵
            highCar = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(5).children('td').eq(5).text());//投石
            highScouter = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(5).children('td').eq(6).text());//斥候騎兵
            eliteAxSoldier = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(8).children('td').eq(0).text());//戦斧
            eliteTwinSwordSoldier = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(8).children('td').eq(1).text());//双剣兵
            eliteHammerSoldier = Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(8).children('td').eq(2).text());//大錘兵

            // フラグ初期化
            var notfound = 1;
            if(troopsData.length){
                var sameUser = troopsData.find( (user) => user.userName === userName );
                if(Object.keys(sameUser).length){
                    addUserDataAll(
                        sameUser,
                        lowerSword,
                        lowerShielder,
                        lowerLancer,
                        lowerArcher,
                        lowerRider,
                        lowerCar,
                        lowerScouter,
                        highSword,
                        highShilder,
                        highLancer,
                        highArcher,
                        highRider,
                        highCar,
                        highScouter,
                        eliteAxSoldier,
                        eliteTwinSwordSoldier,
                        eliteHammerSoldier);
                    notfound = 0;
                }
            }
            if(notfound){
                var userData = {
                    userName:userName,
                    baseNum:1,
                    lowerSword:lowerSword,
                    lowerShielder:lowerShielder,
                    lowerLancer:lowerLancer,
                    lowerArcher:lowerArcher,
                    lowerRider:lowerRider,
                    lowerCar:lowerCar,
                    lowerScouter:lowerScouter,
                    highSword:highSword,
                    highShilder:highShilder,
                    highLancer:highLancer,
                    highArcher:highArcher,
                    highRider:highRider,
                    highCar:highCar,
                    highScouter:highScouter,
                    eliteAxSoldier:eliteAxSoldier,
                    eliteTwinSwordSoldier:eliteTwinSwordSoldier,
                    eliteHammerSoldier:eliteHammerSoldier
                };
                troopsData.push(userData);
                //alert(JSON.stringify(troopsData));
            }
        }
    }

    // 集計処理
    function collection_troopsData(){
        //連打禁止
        botton_off();
        // データを集計する
        let troopsData = [];
        cellection_troopsDataAll(troopsData);
        if( troopsData.length ){
            var headText = getHeadText();
            var oldText = $("#troops_outtext").val();
            $("#troops_outtext").val(oldText+headText);
            troopsData.forEach(
                function(val,index){
                    //alert(JSON.stringify(val));
                    var addText = outputUserData(val);
                    // 前回文字列を取得
                    var oldText = $("#troops_outtext").val();
                    $("#troops_outtext").val(oldText+addText);
                    // テキストエリアの幅を広くする
                    var textRows = Number($("#troops_outtext").attr('rows'));
                    $("#troops_outtext").attr('rows', textRows+ 1);
                }
            );
        }
    }

    // 集計処理(詳細)
    function collection_troopsDataALL(){
        //連打禁止
        botton_off();
        // データを集計する
        let troopsData = [];
        // すべての拠点データを取得
        cellection_troopsDataAll(troopsData);
        if( troopsData.length ){
            var headText = getHeadTextAll();
            var oldText = $("#troops_outtext").val();
            $("#troops_outtext").val(oldText+headText);
            troopsData.forEach(
                function(val,index){
                    //alert(JSON.stringify(val));
                    var addText = outputUserDataAll(val);
                    // 前回文字列を取得
                    var oldText = $("#troops_outtext").val();
                    $("#troops_outtext").val(oldText+addText);
                    // テキストエリアの幅を広くする
                    var textRows = Number($("#troops_outtext").attr('rows'));
                    $("#troops_outtext").attr('rows', textRows+ 1);
                }
            );
        }
    }

    // 拠点情報処理
    function collection_troopsBase(){
        //連打禁止
        botton_off();
        // データを取得する
        let troopsData = [];
        get_troopsData(troopsData);
        if( troopsData.length ){
            var headText = getBaseText();
            var oldText = $("#troops_outtext").val();
            var textData = oldText+headText;
            $("#troops_outtext").val(textData);
            // テキストエリアの幅を広くする
            var textRows = Number($("#troops_outtext").attr('rows'));
            $("#troops_outtext").attr('rows', textRows+ 1);
            //タイマー処理
            var wait = false;
            var count = 0;
            var timer1 = setInterval(
                function() {
                    if(count >= troopsData.length){
                        // 表示を更新
                        $("#troops_outtext").val(textData + "集計完了しました");
                        clearInterval(timer1);
                        return;
                    }
                    if ( !wait ){
                        // 前の処理が終わっているかチェック
                        wait = true;
                        // 要求送信
                        //alert(troopsData[count].kyotenURL);
                        q$.ajax({
                            url: troopsData[count].kyotenURL,
                            type: 'GET',
                            datatype: 'html',
                            cache: false
                        })
                        .done(function(data){
                            // レスポンスデータを受け取る
                            var resp = q$("<div>").append(data);
                            // 拠点座標取得　spanタグclass(xy)から文字列取得
                            var xyPoint = q$("span.xy", resp).text();

                            // 文字列を生成
                            var outputText = outputBaseData(troopsData[count],xyPoint);
                            textData = textData + outputText;
                            // 表示を更新
                            $("#troops_outtext").val(textData + "データ読み込み中");
                            // テキストエリアの幅を広くする
                            var textRows = Number($("#troops_outtext").attr('rows'));
                            $("#troops_outtext").attr('rows', textRows+ 1);
                            // カウントアップ
                            wait = false;
                            count++;
                        }).fail(function(jqXHR, textStatus, errorThrown){
                            // エラーの場合処理

                            // 文字列を生成
                            var outputText = outputBaseData(troopsData[count],'不明');
                            textData = textData + outputText;
                            // 表示を更新
                            $("#troops_outtext").val(textData + "データ読み込み中");
                            // テキストエリアの幅を広くする
                            var textRows = Number($("#troops_outtext").attr('rows'));
                            $("#troops_outtext").attr('rows', textRows+ 1);                            
                            // カウントアップ
                            wait = false;
                            count++;
                        });
                    }
                }, 150  // 150msecごとに
            );
        }
    }

    function getBaseText(){
        var outtext
        = "ユーザ名" + "\t"
        + "武将数" + "\t"
        + "下級兵" + "\t"
        + "上級兵" + "\t"
        + "重盾兵" + "\t"
        + "鋭兵" + "\n";
        return outtext;
    }

    function getHeadTextAll(){
        var outtext
        = "ユーザ名" + "\t"
        + "拠点数" + "\t"
        + "剣兵" + "\t"
        + "盾兵" + "\t"
        + "槍兵" + "\t"
        + "弓兵" + "\t"
        + "騎兵" + "\t"
        + "衝車" + "\t"
        + "斥候" + "\t"
        + "大剣兵" + "\t"
        + "重盾兵" + "\t"
        + "矛槍兵" + "\t"
        + "弩兵" + "\t"
        + "近衛騎兵" + "\t"
        + "投石兵" + "\t"
        + "斥候騎兵" + "\t"
        + "戦斧兵" + "\t"
        + "双剣兵" + "\t"
        + "大錘兵" + "\n";
        return outtext;
    }

    function getHeadText(){
        var outtext
        = "ユーザ名" + "\t"
        + "拠点数" + "\t"
        + "下級兵" + "\t"
        + "上級兵" + "\t"
        + "重盾兵" + "\t"
        + "鋭兵" + "\n";
        return outtext;
    }

    function outputUserDataAll(userData){
        var outtext
        = userData.userName + "\t"
        + userData.baseNum + "\t"
        + userData.lowerSword + "\t"
        + userData.lowerShielder + "\t"
        + userData.lowerLancer + "\t"
        + userData.lowerArcher + "\t"
        + userData.lowerRider + "\t"
        + userData.lowerCar + "\t"
        + userData.lowerScouter + "\t"
        + userData.highSword + "\t"
        + userData.highShilder + "\t"
        + userData.highLancer + "\t"
        + userData.highArcher + "\t"
        + userData.highRider + "\t"
        + userData.highCar + "\t"
        + userData.highScouter + "\t"
        + userData.eliteAxSoldier + "\t"
        + userData.eliteTwinSwordSoldier + "\t"
        + userData.eliteHammerSoldier + "\n"
        return outtext;
    }

    function outputUserData(userData){
        // 一次集計
        lowerNum = userData.lowerSword
                    + userData.lowerShielder
                    + userData.lowerLancer
                    + userData.lowerArcher
                    + userData.lowerRider
                    + userData.lowerCar
                    + userData.lowerScouter
                    + userData.highScouter
                    + userData.highCar;
        higherNum = userData.highSword
                    + userData.highLancer
                    + userData.highRider;
        highShilderNum = userData.highShilder;
        eliteNum =  userData.eliteAxSoldier
                     + userData.eliteTwinSwordSoldier
                     + userData.eliteHammerSoldier;
        var outtext
        = userData.userName + "\t"
        + userData.baseNum + "\t"
        + lowerNum + "\t"
        + higherNum + "\t"
        + highShilderNum + "\t"
        + eliteNum + "\n"
        return outtext;
    }

    function outputBaseData(userData,xyText){ 
        // 一次集計
        lowerNum = userData.lowerSword
                    + userData.lowerShielder
                    + userData.lowerLancer
                    + userData.lowerArcher
                    + userData.lowerRider
                    + userData.lowerCar
                    + userData.lowerScouter
                    + userData.highScouter
                    + userData.highCar;
        higherNum = userData.highSword
                    + userData.highLancer
                    + userData.highRider;
        highShilderNum = userData.highShilder;
        eliteNum =  userData.eliteAxSoldier
                     + userData.eliteTwinSwordSoldier
                     + userData.eliteHammerSoldier;
        busyo = userData.busyo;
        var outtext
        = userData.userName + "\t"
        + xyText + "\t"
        + lowerNum + "\t"
        + higherNum + "\t"
        + highShilderNum + "\t"
        + eliteNum + "\n"
        return outtext;
    }

    //加算
    function addUserData(oldData, lower,higher,highShilder,elite){
        oldData.baseNum += 1;
        oldData.lower += lower;
        oldData.higher += higher;
        oldData.highShilder += highShilder;
        oldData.elite += elite;
    }
    //加算(全て)
    function addUserDataAll(
        oldData,
        lowerSword,
        lowerShielder,
        lowerLancer,
        lowerArcher,
        lowerRider,
        lowerCar,
        lowerScouter,
        highSword,
        highShilder,
        highLancer,
        highArcher,
        highRider,
        highCar,
        highScouter,
        eliteAxSoldier,
        eliteTwinSwordSoldier,
        eliteHammerSoldier
    ){
        oldData.baseNum += 1;
        oldData.lowerSword += lowerSword;
        oldData.lowerShielder += lowerShielder;
        oldData.lowerLancer += lowerLancer;
        oldData.lowerArcher += lowerArcher;
        oldData.lowerRider += lowerRider;
        oldData.lowerCar += lowerCar;
        oldData.lowerScouter += lowerScouter;
        oldData.highSword += highSword;
        oldData.highShilder += highShilder;
        oldData.highLancer += highLancer;
        oldData.highArcher += highArcher;
        oldData.highRider += highRider;
        oldData.highCar += highCar;
        oldData.highScouter += highScouter;
        oldData.eliteAxSoldier += eliteAxSoldier;
        oldData.eliteTwinSwordSoldier += eliteTwinSwordSoldier;
        oldData.eliteHammerSoldier += eliteHammerSoldier;
    }

    function test(){
        var wait = false;
        var timer1 = setInterval(
            function() {
                if (wait) {
                    return;
                }
                wait = true;

                q$("#alliance_pos_get_all").text('(' + count + '/' + max + ')人目の座標取得中...');
                q$.ajax({
                    url: BASE_URL + "/user",
                    type: 'GET',
                    datatype: 'html',
                    cache: false,
                    data: {'user_id': users[count - 1]}
                })
                .done(function(res){
                    var resp = q$("<div>").append(res);
                    var result = "";
                    var landelems = q$("#gray02Wrapper table[class='commonTables'] tr", resp);
                    var rowct = 0;
                    for (var n = 0; n < landelems.length; n++) {
                        if (landelems.eq(n).children('th').eq(0).text() == '名前') {
                            rowct ++;
                            break;
                        }
                        rowct ++;
                    }
                    var start = rowct + (landelems.eq(rowct).children("th").length > 0) * 1;
                    var match = landelems.eq(start).children("td").eq(1).text().match(/([-]*[0-9]*),[ ]*([-]*[0-9]*)/);
                    elems.eq(count + 1).children('td').eq(coln).html(
                        `<a href='${BASE_URL}/map.php?x=${match[1]}&y=${match[2]}' target='_blank'>(${match[1]},${match[2]})</a>`
                    );

                    userlist.push({id: users[count - 1], x: match[1], y: match[2]});
                    count++;
                    if (count > max) {
                        // 一回取得したデータは鯖＋同盟IDごとに保存
                        GM_setValue(SERVER_NAME + '_alist_' + alliance_id, userlist);

                        clearInterval(timer1);
                        q$("#alliance_pos_get_all").css('color', 'red').text('完了しました。');
                    }
                    wait = false;
                });
            }, 150  // 150msecごとに
        );
    }

})();