//////////////////////
// ==UserScript==
// @name		南蛮集計ツール
// @namespace   南蛮集計ツール
// @description	ブラウザ三国志 南蛮出兵をカウントする（監視）ツール♥
// @include		*://w*.3gokushi.jp/alliance/detail.php*
// @include		*://w*.3gokushi.jp/report/detail.php*
// @connect		3gokushi.jp
// @author      みどり
// @updateURL	//https://github.com/MIDORI-bro3/-bro3_siegehelper/blob/master/src/siegeSupport.user.js
// @grant none
// @grant GM_setValue
// @grant GM_getValue
// @grant GM_getResourceText
// @require	https://code.jquery.com/jquery-2.1.4.min.js
// @require	https://code.jquery.com/ui/1.11.4/jquery-ui.min.js
// @resource	jqueryui_css	http://ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/themes/smoothness/jquery-ui.css
// @version 	0.0.0
// ==================
// 2021.05.23	0.0.0  配布初期バージョン
//
// ==/UserScript==
var VERSION = "0.0.0";

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
    //ボタン3(予約確認))
    $('table[summary="件名"]').after("<button id='troops_button_3' disabled=false >ボタン3</button>");
    //ボタン2(集計：詳細)
    $('table[summary="件名"]').after("<button id='troops_button_collectdetail' disabled=false>集計(詳細)</button>");
    //ボタン1(集計)
    $('table[summary="件名"]').after("<button id='troops_button_collect' disabled=false>集計</button>");
    //情報表示用テキストボックス
    $('table[summary="件名"]').after("<div><p>TroopsMonitoring</p></div><div style='margin-left: 4px;'><textarea id='troops_outtext' cols='40' rows='1' style='overflow: margin: 4px; '></textarea></div>");

    //援軍数
    //var troopsNum = ($('table[summary="防御者"]').has('th[.defenser,contains("援軍")]')).length;
    //var troopsNum = $($('table[summary="防御者"]').has('th[.defenser]')).length;
    var troopsNum = $('table[summary="防御者"]').has('th[class = "defenser"]').length;
    $("#troops_outtext").val( "部隊数=" + troopsNum + "\n" );
    if( 0 == troopsNum){
        return;
    }

    //ボタンクリックで動作するイベントを設定
    $('#troops_button_collect').on('click',function(){collection_troopsData();});
    //$('#troops_button_2').on('click',function(){reservation_check();});
    //$('#troops_button_3').on('click',function(){reservation_make();});
    //$('#troops_button_4').on('click',function(){report_adjecent();});

    // ボタンを有効にする
    //var collect_button = document.getElementById('troops_button_collect').disabled;
    document.getElementById('troops_button_collect').disabled=false;
    document.getElementById('troops_button_collectdetail').disabled=false;
    
    // 集計処理
    function collection_troopsData(){
        //連打禁止
        document.getElementById('troops_button_collect').disabled=true;
        document.getElementById('troops_button_collectdetail').disabled=true;

        // 集計用オブジェクト
        let troopsData=[];
        // データ読み込みループ
        for(var i=0; i < troopsNum; i++ ){
            //ユーザネームを取得
            var userName = $('th[class = "defenserBase"]').eq(i).children('a').eq(1).text();
            var lowerNum = 0;
            var higherNum = 0;
            var highShilderNum = 0;
            var eliteNum = 0;
            // 頭の悪いソース何とかしたい。
            lowerNum += Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(2).children('td').eq(0).text());//剣兵
            lowerNum += Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(2).children('td').eq(1).text());//盾兵
            lowerNum += Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(2).children('td').eq(2).text());//槍兵
            lowerNum += Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(2).children('td').eq(3).text());//弓兵
            lowerNum += Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(2).children('td').eq(4).text());//騎兵
            lowerNum += Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(2).children('td').eq(5).text());//衝車
            lowerNum += Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(2).children('td').eq(6).text());//斥候
            higherNum += Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(5).children('td').eq(0).text());//大剣兵
            highShilderNum += Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(5).children('td').eq(1).text());//重盾兵
            higherNum += Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(5).children('td').eq(2).text());//矛槍兵
            higherNum += Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(5).children('td').eq(3).text());//弩兵
            higherNum += Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(5).children('td').eq(4).text());//近衛騎兵
            lowerNum += Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(5).children('td').eq(5).text());//投石兵
            lowerNum += Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(5).children('td').eq(6).text());//斥候騎兵
            eliteNum += Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(8).children('td').eq(0).text());//戦斧
            eliteNum += Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(8).children('td').eq(1).text());//双剣兵
            eliteNum += Number($('tbody').has('th[class = "defenserBase"]').eq(i).children('tr').eq(8).children('td').eq(2).text());//大錘兵
            // フラグ初期化
            var notfound = 1;
        if(troopsData.length){
                var sameUser = troopsData.find( (user) => user.userName === userName );
                //alert(JSON.stringify(sameUser));//debug
                if(Object.keys(sameUser).length){
                    addUserData(sameUser,lowerNum,higherNum,highShilderNum,eliteNum);
                    notfound = 0;
                }
            }
            if(notfound){
                var userData = {
                    userName:userName,
                    baseNum:1,
                    lower:lowerNum,
                    higher:higherNum,
                    highShilder:highShilderNum,
                    elite:eliteNum
                };
                troopsData.push(userData);
                //alert(JSON.stringify(troopsData));
            }
        }
        if( troopsData.length ){
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

    function outputUserData(userData){
        var outtext 
        = userData.userName + "\t"
        + userData.baseNum + "\t"
        + userData.lower + "\t"
        + userData.higher + "\t"
        + userData.highShilder + "\t"
        + userData.elite + "\n"
        return outtext;
    }
    //新規オブジェクト生成
    function newUserData(userName,baseNum,lower,higher,highShilder,elite){
        this.userName = userName;
        this.baseNum = baseNum;
        this.lower = lower;
        this.higher = higher;
        this.highShilder = highShilder;
        this.elite = elite;
    }
    //加算
    function addUserData(oldData, lower,higher,highShilder,elite){
        oldData.baseNum += 1;
        oldData.lower += lower;
        oldData.higher += higher;
        oldData.highShilder += highShilder;
        oldData.elite += elite;
    }

　　// 予約解除処理
    function reservation_cancle(){
        // 送信情報配列
        var reqpalam = {
            'func':'DeleteReservation',
            'fortName':baseName,
            'playerName':userName,
            'note':""
        };
        //多重クリック禁止用
        button_controler(0);//全部トーンダウン
        $("#SiegeHleper_outtext").val( "予約解除処理中:Please wait");
        $.ajax({
            type: "GET",
            url: gasUrl,
            data: reqpalam,
            dataType:'jsonp',//jsonpの場合POSTが使えないらしい。。。
            callback: 'callback'//コールバックパラメータ名の指定
        }).done(function(data) {
            //成功時の処理
            //予約結果確認
           reservation_check();
        }).fail(function(jqXHR, textStatus, errorThrown){
            $("#SiegeHleper_outtext").val("なんかエラー：エラー処理(予約確認)\n"
                                          +"XMLHttpRequest : " + jqXHR.status
                                          + "\ntextStatus     : " + textStatus
                                          + "\nerrorThrown: " + errorThrown.message);
        });
    }

　　// 隣接報告処理
    function report_adjecent(){
        // 送信情報配列
        var reqpalam = {
            'func':'ReportAdjacent',
            'fortName':baseName
        };
        //$("#SiegeHleper_outtext").val( "隣接報告中:Please wait");
        //多重クリック禁止用
        button_controler("adjecentOFF");//報告ボタンのみOFF
        $.ajax({
            type: "get",
            url: gasUrl,
            data: reqpalam,
            dataType:'jsonp',
            callback: 'callback'//コールバックパラメータ名の指定
        }).done(function(data) {
            //成功時の処理
            alert("SSに報告をアップロードしました");
            button_controler("adjecentON");//報告ボタンのみON
        }).fail(function(jqXHR, textStatus, errorThrown){
            $("#SiegeHleper_outtext").val("なんかエラー：エラー処理(予約確認)\n"
                                          +"XMLHttpRequest : " + jqXHR.status
                                          + "\ntextStatus     : " + textStatus
                                          + "\nerrorThrown: " + errorThrown.message);
        });
    }
　　// 予約チェック処理
    function reservation_check(){
        // 送信情報配列
        var reqpalam = {
            'func':'CheckReservation',
            'fortName':baseName
        };
        $("#SiegeHleper_outtext").val( "予約確認中:Please wait");
        //多重クリック禁止用
        button_controler(0);//全部トーンダウン
        $.ajax({
            type: "get",
            url: gasUrl,
            data: reqpalam,
            dataType:'jsonp',
            callback: 'callback'//コールバックパラメータ名の指定
        }).done(function(data) {
            //成功時の処理
            $("#SiegeHleper_outtext").val("予約情報取得成功⇒解析中:please wait");
            if( data.length === 0){
                $("#SiegeHleper_outtext").val("だれも予約してないよ～");
                button_controler(1);//予約なし
            }
            else{
                $("#SiegeHleper_outtext").val(data.length+"人が予約中");
                for( var loop = 0; loop < data.length; loop++){
                    if(data[loop][attackerKey]){
                        //自分の予約かチェック
                        if(userName == data[loop][attackerKey]){
                            $("#SiegeHleper_outtext").val(String($("#SiegeHleper_outtext").val())+"["+data[loop][attackerKey]+"(★あなた★)]");
                            button_controler(2);//自分が予約
                        }
                        else{
                            $("#SiegeHleper_outtext").val(String($("#SiegeHleper_outtext").val())+"["+data[loop][attackerKey]+"]");
                            button_controler(3);//他人が予約
                        }
                    }
                }
            }
        }).fail(function(jqXHR, textStatus, errorThrown){
            $("#SiegeHleper_outtext").val("なんかエラー：エラー処理(予約確認)\n"
                                          +"XMLHttpRequest : " + jqXHR.status
                                          + "\ntextStatus     : " + textStatus
                                          + "\nerrorThrown: " + errorThrown.message);
        });
    }
　　// 予約処理
    function reservation_make(){
        // 送信情報配列
        var reqpalam = {
            'func':'MakeReservation',
            'fortName':baseName,
            'playerName':userName,
            'note':""
        };
        //多重クリック禁止用
        button_controler(0);//全部トーンダウン
        $("#SiegeHleper_outtext").val( "予約処理中:Please wait");
        $.ajax({
            type: "GET",
            url: gasUrl,
            data: reqpalam,
            dataType:'jsonp',//jsonpの場合POSTが使えないらしい。。。
            callback: 'callback'//コールバックパラメータ名の指定
        }).done(function(data) {
            //成功時の処理
            //予約結果確認
           reservation_check();
        }).fail(function(jqXHR, textStatus, errorThrown){
            $("#SiegeHleper_outtext").val("なんかエラー：エラー処理(予約確認)\n"
                                          +"XMLHttpRequest : " + jqXHR.status
                                          + "\ntextStatus     : " + textStatus
                                          + "\nerrorThrown: " + errorThrown.message);
        });
    }
})();