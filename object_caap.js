
////////////////////////////////////////////////////////////////////
//                          caap OBJECT
// this is the main object for the game, containing all methods, globals, etc.
/////////////////////////////////////////////////////////////////////

caap = {
    stats: {},
    lastReload: new Date(),
    waitingForDomLoad : false,
    node_trigger : null,
    autoReloadMilliSecs: 15 * 60 * 1000,

    userRe: new RegExp("(userId=|user=|/profile/|uid=)([0-9]+)"),
    levelRe: new RegExp('Level\\s*:\\s*([0-9]+)', 'i'),
    rankRe: new RegExp(',\\s*level\\s*:?\\s*[0-9]+\\s+([a-z ]+)', 'i'),
    armyRe: new RegExp('My Army\\s*\\(?([0-9]+)', 'i'),
    statusRe: new RegExp('([0-9\\.]+)\\s*/\\s*([0-9]+)', 'i'),
    energyRe: new RegExp("([0-9]+)\\s+(energy)", "i"),
    experienceRe: new RegExp("\\+([0-9]+)"),
    influenceRe: new RegExp("([0-9]+)%"),
    moneyRe: new RegExp("\\$([0-9,]+)\\s*-\\s*\\$([0-9,]+)", "i"),

    init: function () {
        this.addExpDisplay();
        this.SetControls();
        this.AddListeners();
        this.CheckResults();
    },

    /////////////////////////////////////////////////////////////////////
    //                          UTILITY FUNCTIONS
    // Small functions called a lot to reduce duplicate code
    /////////////////////////////////////////////////////////////////////

    VisitUrl: function (url, loadWaitTime) {
        this.waitMilliSecs = (loadWaitTime) ? loadWaitTime : 5000;
        window.location.href = url;
    },

    Click: function (obj, loadWaitTime) {
        if (!obj) {
            gm.log('ERROR: Null object passed to Click');
            return null;
        }

        if (caap.waitingForDomLoad === false) {
            caap.JustDidIt('clickedOnSomething');
            caap.waitingForDomLoad = true;
        }

        this.waitMilliSecs = (loadWaitTime) ? loadWaitTime : 5000;
        var evt = document.createEvent("MouseEvents");
        evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        return !obj.dispatchEvent(evt);
    },

    ClickAjax: function (link, loadWaitTime) {
        if (!link) {
            gm.log('ERROR: No link passed to Click Ajax');
            return;
        }

        if (gm.getValue('clickUrl', '').indexOf(link) < 0) {
            gm.setValue('clickUrl', 'http://apps.facebook.com/castle_age/' + link);
            caap.waitingForDomLoad = false;
        }

        this.VisitUrl("javascript:void(a46755028429_ajaxLinkSend('globalContainer', '" + link + "'))", loadWaitTime);
    },

    ClickWait: function (obj, loadWaitTime) {
        this.setTimeout(function () {
            this.Click(obj, loadWaitTime);
        }, 1000 + Math.floor(Math.random() * 1000));
    },

    generalList: [],

    generalBuyList: [],

    generalIncomeList: [],

    generalBankingList: [],

    standardGeneralList: [
        'Idle',
        'Monster',
        'Fortify',
        'Battle',
        'SubQuest'
    ],

    BuildGeneralLists: function () {
        this.generalList = [
            'Get General List',
            'Use Current',
            'Under Level 4'
        ].concat(gm.getList('AllGenerals'));

        var crossList = function (checkItem) {
            return (caap.generalList.indexOf(checkItem) >= 0);
        };

        this.generalBuyList = [
            'Get General List',
            'Use Current',
            'Darius',
            'Lucius',
            'Garlan',
            'Penelope'
        ].filter(crossList);

        this.generalIncomeList = [
            'Get General List',
            'Use Current',
            'Scarlett',
            'Mercedes',
            'Cid'
        ].filter(crossList);

        this.generalBankingList = [
            'Get General List',
            'Use Current',
            'Aeris'
        ].filter(crossList);
    },

    GetCurrentGeneral: function () {
        try {
            var webSlice = nHtml.FindByAttrContains(document.body, "div", "class", 'general_name_div3');
            if (!webSlice) {
                throw "Couldn't find current general div";
            }

            return webSlice.innerHTML.trim();
        } catch (err) {
            gm.log("ERROR in GetCurrentGeneral: " + err);
            return 'Use Current';
        }
    },

    CheckResults_generals: function () {
        var gens = nHtml.getX('//div[@class=\'generalSmallContainer2\']', document, nHtml.xpath.unordered);
        gm.setValue('AllGenerals', '');
        gm.setValue('GeneralImages', '');
        gm.setValue('LevelUpGenerals', '');
        for (var x = 0; x < gens.snapshotLength; x += 1) {
            var gen = nHtml.getX('./div[@class=\'general_name_div3\']/div[1]/text()', gens.snapshotItem(x), nHtml.xpath.string).replace(/[\t\r\n]/g, '');
            var img = nHtml.getX('.//input[@class=\'imgButton\']/@src', gens.snapshotItem(x), nHtml.xpath.string);
            img = nHtml.getHTMLPredicate(img);
            //var atk = nHtml.getX('./div[@class=\'generals_indv_stats\']/div[1]/text()', gens.snapshotItem(x), nHtml.xpath.string);
            //var def = nHtml.getX('./div[@class=\'generals_indv_stats\']/div[2]/text()', gens.snapshotItem(x), nHtml.xpath.string);
            //var skills = nHtml.getX('.//table//td[1]/div/text()', gens.snapshotItem(x), nHtml.xpath.string).replace(/[\t\r\n]/gm,'');
            var level = nHtml.getX('./div[4]/div[2]/text()', gens.snapshotItem(x), nHtml.xpath.string).replace(/Level /gi, '').replace(/[\t\r\n]/g, '');
            //var genatts = gen + ":" + atk + "/" + def + ":L" + level + ":" + img + ","
            gm.listPush('AllGenerals', gen);
            gm.listPush('GeneralImages', gen + ':' + img);
            if (level < 4) {
                gm.listPush('LevelUpGenerals', gen);
            }
        }

        gm.setList('AllGenerals', gm.getList('AllGenerals').sort());
        //gm.log("All Generals: " + gm.getList('AllGenerals'));
    },

    ClearGeneral: function (whichGeneral) {
        gm.log('Setting ' + whichGeneral + ' to "Use Current"');
        gm.setValue(whichGeneral, 'Use Current');
        this.BuildGeneralLists();
        for (var generalType in this.standardGeneralList) {
            if (this.standardGeneralList.hasOwnProperty(generalType)) {
                this.ChangeDropDownList(this.standardGeneralList[generalType] + 'General', this.generalList, gm.getValue(this.standardGeneralList[generalType] + 'General', 'Use Current'));
            }
        }

        this.ChangeDropDownList('BuyGeneral', this.generalBuyList, gm.getValue('BuyGeneral', 'Use Current'));
        this.ChangeDropDownList('IncomeGeneral', this.generalIncomeList, gm.getValue('IncomeGeneral', 'Use Current'));
        this.ChangeDropDownList('BankingGeneral', this.generalBankingList, gm.getValue('BankingGeneral', 'Use Current'));
        this.ChangeDropDownList('LevelUpGeneral', this.generalList, gm.getValue('LevelUpGeneral', 'Use Current'));
    },

    SelectGeneral: function (whichGeneral) {
        if (gm.getValue('LevelUpGeneral', 'Use Current') != 'Use Current') {
            var generalType = whichGeneral.replace(/General/i, '').trim();
            if (gm.getValue(generalType + 'LevelUpGeneral', false) &&
                this.stats.exp.dif &&
                this.stats.exp.dif <= gm.getValue('LevelUpGeneralExp', 0)) {
                whichGeneral = 'LevelUpGeneral';
                gm.log('Using level up general');
            }
        }

        var general = gm.getValue(whichGeneral, '');
        if (!general) {
            return false;
        }

        if (!general || /use current/i.test(general)) {
            return false;
        }

        if (/under level 4/i.test(general)) {
            if (!gm.getList('LevelUpGenerals').length) {
                return this.ClearGeneral(whichGeneral);
            }

            if (gm.getValue('ReverseLevelUpGenerals')) {
                general = gm.getList('LevelUpGenerals').reverse().pop();
            } else {
                general = gm.getList('LevelUpGenerals').pop();
            }
        }

        var getCurrentGeneral = this.GetCurrentGeneral();
        if (!getCurrentGeneral) {
            this.ReloadCastleAge();
        }

        var currentGeneral = getCurrentGeneral.replace('**', '');
        if (general.indexOf(currentGeneral) >= 0) {
            return false;
        }

        gm.log('Changing from ' + currentGeneral + ' to ' + general);
        if (this.NavigateTo('mercenary,generals', 'tab_generals_on.gif')) {
            return true;
        }

        if (/get general list/i.test(general)) {
            return this.ClearGeneral(whichGeneral);
        }

        var hasGeneral = function (genImg) {
            return (genImg.indexOf(general.replace(new RegExp(":.+"), '')) >= 0);
        };

        var generalImage = gm.getList('GeneralImages').filter(hasGeneral).toString().replace(new RegExp(".+:"), '');
        if (this.CheckForImage(generalImage)) {
            return this.NavigateTo(generalImage);
        }

        this.SetDivContent('Could not find ' + general);
        gm.log('Could not find ' + generalImage);
        return this.ClearGeneral(whichGeneral);
    },

    oneMinuteUpdate: function (funcName) {
        if (!gm.getValue('reset' + funcName) && !this.WhileSinceDidIt(funcName + 'Timer', 60)) {
            return false;
        }

        this.JustDidIt(funcName + 'Timer');
        gm.setValue('reset' + funcName, false);
        return true;
    },

    NavigateTo: function (pathToPage, imageOnPage) {
        try {
            var content = document.getElementById('content');
            if (!content) {
                gm.log('No content to Navigate to ' + imageOnPage + ' using ' + pathToPage);
                return false;
            }

            if (imageOnPage && this.CheckForImage(imageOnPage)) {
                return false;
            }

            var pathList = pathToPage.split(",");
            for (var s = pathList.length - 1; s >= 0; s -= 1) {
                var a = nHtml.FindByAttrXPath(content, 'a', "contains(@href,'/" + pathList[s] + ".php') and not(contains(@href,'" + pathList[s] + ".php?'))");
                if (a) {
                    gm.log('Go to ' + pathList[s]);
                    caap.Click(a);
                    return true;
                }

                var imageTest = pathList[s];
                if (imageTest.indexOf(".") == -1) {
                    imageTest = imageTest + '.';
                }

                var input = nHtml.FindByAttrContains(document.body, "input", "src", imageTest);
                if (input) {
                    gm.log('Click on image ' + input.src.match(/[\w.]+$/));
                    caap.Click(input);
                    return true;
                }

                var img = nHtml.FindByAttrContains(document.body, "img", "src", imageTest);
                if (img) {
                    gm.log('Click on image ' + img.src.match(/[\w.]+$/));
                    caap.Click(img);
                    return true;
                }
            }

            gm.log('Unable to Navigate to ' + imageOnPage + ' using ' + pathToPage);
            return false;
        } catch (error) {
            gm.log("ERROR in NavigateTo: " + error);
            gm.log('Unable to Navigate to ' + imageOnPage + ' using ' + pathToPage);
            return false;
        }
    },

    CheckForImage: function (image, webSlice, subDocument) {
        if (!webSlice) {
            if (!subDocument) {
                webSlice = document.body;
            } else {
                webSlice = subDocument.body;
            }
        }

        var imageSlice = nHtml.FindByAttrContains(webSlice, 'input', 'src', image, subDocument);
        if (imageSlice) {
            return imageSlice;
        }

        imageSlice = nHtml.FindByAttrContains(webSlice, 'img', 'src', image, subDocument);
        if (imageSlice) {
            return imageSlice;
        }

        imageSlice = nHtml.FindByAttrContains(webSlice, 'div', 'style', image, subDocument);
        if (imageSlice) {
            return imageSlice;
        }

        return false;
    },

    WhileSinceDidIt: function (nameOrNumber, seconds) {
        if (!/\d+/.test(nameOrNumber)) {
            nameOrNumber = gm.getValue(nameOrNumber, 0);
        }

        var now = (new Date().getTime());
        return (parseInt(nameOrNumber, 10) < (now - 1000 * seconds));
    },

    JustDidIt: function (name) {
        var now = (new Date().getTime());
        gm.setValue(name, now.toString());
    },

    DeceiveDidIt: function (name) {
        gm.log("Deceive Did It");
        var now = (new Date().getTime()) - 6500000;
        gm.setValue(name, now.toString());
    },

    // Returns true if timer is passed, or undefined
    CheckTimer: function (name) {
        var nameTimer = gm.getValue(name);
        if (!nameTimer) {
            return true;
        }

        var now = new Date().getTime();
        return (nameTimer < now);
    },

    FormatTime: function (time) {
        try {
            var d_names = [
                "Sun",
                "Mon",
                "Tue",
                "Wed",
                "Thu",
                "Fri",
                "Sat"
            ];
            var t_day = time.getDay();
            var t_hour = time.getHours();
            var t_min = time.getMinutes();

            if (gm.getValue("use24hr", true)) {
                t_hour = t_hour + "";
                if (t_hour.length === 1) {
                    t_hour = "0" + t_hour;
                }

                t_min = t_min + "";
                if (t_min.length === 1) {
                    t_min = "0" + t_min;
                }

                return d_names[t_day] + " " + t_hour + ":" + t_min;
            } else {
                var a_p = "PM";
                if (t_hour < 12) {
                    a_p = "AM";
                }

                if (t_hour === 0) {
                    t_hour = 12;
                }

                if (t_hour > 12) {
                    t_hour = t_hour - 12;
                }

                t_min = t_min + "";
                if (t_min.length === 1) {
                    t_min = "0" + t_min;
                }

                return d_names[t_day] + " " + t_hour + ":" + t_min + " " + a_p;
            }
        } catch (e) {
            gm.log("ERROR in FormatTime: " + e);
            return "Time Err";
        }
    },

    DisplayTimer: function (name) {
        var nameTimer = gm.getValue(name);
        if (!nameTimer) {
            return false;
        }

        var newTime = new Date();
        newTime.setTime(parseInt(nameTimer, 10));
        return this.FormatTime(newTime);
    },

    SetTimer: function (name, time) {
        var now = (new Date().getTime());
        now += time * 1000;
        gm.setValue(name, now.toString());
    },

    NumberOnly: function (num) {
        var numOnly = parseFloat(num.toString().replace(new RegExp("[^0-9\\.]", "g"), ''));
        //gm.log("NumberOnly: " + numOnly);
        return numOnly;
    },

    RemoveHtmlJunk: function (html) {
        return html.replace(new RegExp("\\&[^;]+;", "g"), '');
    },

    /////////////////////////////////////////////////////////////////////
    //                          DISPLAY FUNCTIONS
    // these functions set up the control applet and allow it to be changed
    /////////////////////////////////////////////////////////////////////

    AppendTextToDiv: function (divName, text) {
        $('#' + divName).append(text);
    },

    defaultDropDownOption: "<option disabled='disabled' value='not selected'>Choose one</option>",

    MakeDropDown: function (idName, dropDownList, instructions, formatParms) {
        var selectedItem = gm.getValue(idName, 'defaultValue');
        if (selectedItem == 'defaultValue') {
            selectedItem = gm.setValue(idName, dropDownList[0]);
        }

        var count = 0;
        for (var itemcount in dropDownList) {
            if (dropDownList.hasOwnProperty(itemcount)) {
                if (selectedItem == dropDownList[itemcount]) {
                    break;
                }

                count += 1;
            }
        }

        var htmlCode = "<select id='caap_" + idName + "' " + ((instructions[count]) ? " title='" + instructions[count] + "' " : '') + formatParms + ">";
        htmlCode += this.defaultDropDownOption;
        for (var item in dropDownList) {
            if (dropDownList.hasOwnProperty(item)) {
                if (instructions) {
                    htmlCode += "<option value='" + dropDownList[item] + "'" + ((selectedItem == dropDownList[item]) ? " selected='selected'" : '') + ((instructions[item]) ? " title='" + instructions[item] + "'" : '') + ">" + dropDownList[item] + "</option>";
                } else {
                    htmlCode += "<option value='" + dropDownList[item] + "'" + ((selectedItem == dropDownList[item]) ? " selected='selected'" : '') + ">" + dropDownList[item] + "</option>";
                }
            }
        }

        htmlCode += '</select>';
        return htmlCode;
    },

    /*-------------------------------------------------------------------------------------\
    DBDropDown is used to make our drop down boxes for dash board controls.  These require
    slightly different HTML from the side controls.
    \-------------------------------------------------------------------------------------*/
    DBDropDown: function (idName, dropDownList, instructions, formatParms) {
        var selectedItem = gm.getValue(idName, 'defaultValue');
        if (selectedItem == 'defaultValue') {
            selectedItem = gm.setValue(idName, dropDownList[0]);
        }

        var htmlCode = " <select id='caap_" + idName + "' " + formatParms + "'><option>" + selectedItem;
        for (var item in dropDownList) {
            if (dropDownList.hasOwnProperty(item)) {
                if (selectedItem != dropDownList[item]) {
                    if (instructions) {
                        htmlCode += "<option value='" + dropDownList[item] + "' " + ((instructions[item]) ? " title='" + instructions[item] + "'" : '') + ">"  + dropDownList[item];
                    } else {
                        htmlCode += "<option value='" + dropDownList[item] + "'>" + dropDownList[item];
                    }
                }
            }
        }

        htmlCode += '</select>';
        return htmlCode;
    },

    MakeCheckBox: function (idName, defaultValue, varClass, instructions, tableTF) {
        var checkItem = gm.getValue(idName, 'defaultValue');
        if (checkItem == 'defaultValue') {
            gm.setValue(idName, defaultValue);
        }

        var htmlCode = "<input type='checkbox' id='caap_" + idName + "' title=" + '"' + instructions + '"' + ((varClass) ? " class='" + varClass + "'" : '') + (gm.getValue(idName) ? 'checked' : '') + ' />';
        if (varClass) {
            if (tableTF) {
                htmlCode += "</td></tr></table>";
            } else {
                htmlCode += '<br />';
            }

            htmlCode += this.AddCollapsingDiv(idName, varClass);
        }

        return htmlCode;
    },

    MakeNumberForm: function (idName, instructions, initDefault, formatParms) {
        if (gm.getValue(idName, 'defaultValue') == 'defaultValue') {
            gm.setValue(idName, initDefault);
        }

        if (!initDefault) {
            initDefault = '';
        }

        if (!formatParms) {
            formatParms = "size='4'";
        }

        var htmlCode = " <input type='text' id='caap_" + idName + "' " + formatParms + " title=" + '"' + instructions + '" ' + "value='" + gm.getValue(idName, '') + "' />";
        return htmlCode;
    },

    MakeCheckTR: function (text, idName, defaultValue, varClass, instructions, tableTF) {
        var htmlCode = "<tr><td style='width: 90%'>" + text +
            "</td><td style='width: 10%; text-align: right'>" +
            this.MakeCheckBox(idName, defaultValue, varClass, instructions, tableTF);
        if (!tableTF) {
            htmlCode += "</td></tr>";
        }

        return htmlCode;
    },

    AddCollapsingDiv: function (parentId, subId) {
        var htmlCode = "<div id='caap_" + subId + "' style='display: " +
            (gm.getValue(parentId, false) ? 'block' : 'none') + "'>";
        return htmlCode;
    },

    ToggleControl: function (controlId, staticText) {
        var currentDisplay = gm.getValue('Control_' + controlId, "none");
        var displayChar = "-";
        if (currentDisplay == "none") {
            displayChar = "+";
        }

        var toggleCode = '<b><a id="caap_Switch_' + controlId +
            '" href="javascript:;" style="text-decoration: none;"> ' +
            displayChar + ' ' + staticText + '</a></b><br />' +
            "<div id='caap_" + controlId + "' style='display: " + currentDisplay + "'>";
        return toggleCode;
    },

    MakeTextBox: function (idName, instructions, formatParms) {
        var htmlCode = "<textarea title=" + '"' + instructions + '"' + " type='text' id='caap_" + idName + "' " + formatParms + ">" + gm.getValue(idName, '') + "</textarea>";
        return htmlCode;
    },

    SaveBoxText: function (idName) {
        try {
            var boxText = $("#caap_" + idName).val();
            if (typeof boxText != 'string') {
                throw "Value of the textarea id='caap_" + idName + "' is not a string: " + boxText;
            }

            gm.setValue(idName, boxText);
            return true;
        } catch (err) {
            gm.log("ERROR in SaveBoxText: " + err);
            return false;
        }
    },

    SetDivContent: function (idName, mess) {
        try {
            if (gm.getValue('SetTitle', false) && gm.getValue('SetTitleAction', false) && idName == "activity_mess") {
                var DocumentTitle = mess.replace("Activity: ", '') + " - ";

                if (gm.getValue('SetTitleName', false)) {
                    DocumentTitle += gm.getValue('PlayerName', 'CAAP') + " - ";
                }

                document.title = DocumentTitle + global.documentTitle;
            }

            $('#caap_' + idName).html(mess);
        } catch (err) {
            gm.log("ERROR in SetDivContent: " + err);
        }
    },

    questWhenList: [
        'Energy Available',
        'At Max Energy',
        'Not Fortifying',
        'Never'
    ],

    questAreaList: [
        'Quest',
        'Demi Quests',
        'Atlantis'
    ],

    landQuestList: [
        'Land of Fire',
        'Land of Earth',
        'Land of Mist',
        'Land of Water',
        'Demon Realm',
        'Undead Realm',
        'Underworld'
    ],

    demiQuestList: [
        'Ambrosia',
        'Malekus',
        'Corvintheus',
        'Aurora',
        'Azeron'
    ],

    atlantisQuestList: [
        'Null'
    ],

    questForList: [
        'Advancement',
        'Max Influence',
        'Max Gold',
        'Max Experience',
        'Manual'
    ],

    SelectDropOption: function (idName, value) {
        try {
            $("#caap_" + idName + " option").removeAttr('selected');
            $("#caap_" + idName + " option[value='" + value + "']").attr('selected', 'selected');
            return true;
        } catch (e) {
            gm.log("ERROR in SelectDropOption: " + e);
            return false;
        }
    },

    ShowAutoQuest: function () {
        try {
            $("#stopAutoQuest").text("Stop auto quest: " + gm.getObjVal('AutoQuest', 'name') + " (energy: " + gm.getObjVal('AutoQuest', 'energy') + ")");
            $("#stopAutoQuest").css('display', 'block');
            return true;
        } catch (e) {
            gm.log("ERROR in ShowAutoQuest: " + e);
            return false;
        }
    },

    ClearAutoQuest: function () {
        try {
            $("#stopAutoQuest").text("");
            $("#stopAutoQuest").css('display', 'none');
            return true;
        } catch (e) {
            gm.log("ERROR in ClearAutoQuest: " + e);
            return false;
        }
    },

    ManualAutoQuest: function () {
        try {
            this.SelectDropOption('WhyQuest', 'Manual');
            this.ClearAutoQuest();
            return true;
        } catch (e) {
            gm.log("ERROR in ManualAutoQuest: " + e);
            return false;
        }
    },

    ChangeDropDownList: function (idName, dropList, option) {
        try {
            $("#caap_" + idName + " option").remove();
            $("#caap_" + idName).append(this.defaultDropDownOption);
            for (var item in dropList) {
                if (dropList.hasOwnProperty(item)) {
                    if (item == '0' && !option) {
                        gm.setValue(idName, dropList[item]);
                        gm.log("Saved: " + idName + "  Value: " + dropList[item]);
                    }

                    $("#caap_" + idName).append("<option value='" + dropList[item] + "'>" + dropList[item] + "</option>");
                }
            }

            if (option) {
                $("#caap_" + idName + " option[value='" + option + "']").attr('selected', 'selected');
            } else {
                $("#caap_" + idName + " option:eq(1)").attr('selected', 'selected');
            }
            return true;
        } catch (e) {
            gm.log("ERROR in ChangeDropDownList: " + e);
            return false;
        }
    },

    divList: [
        'activity_mess',
        'idle_mess',
        'quest_mess',
        'battle_mess',
        'fortify_mess',
        'heal_mess',
        'demipoint_mess',
        'demibless_mess',
        'level_mess',
        'arena_mess',
        'debug1_mess',
        'debug2_mess',
        'control'
    ],

    controlXY: {
        selector: '.UIStandardFrame_Content',
        x: 0,
        y: 0
    },

    GetControlXY: function (reset) {
        try {
            var newTop = 0;
            if (reset) {
                newTop = $(this.controlXY.selector).offset().top;
            } else {
                newTop = this.controlXY.y;
            }

            var newLeft = 0;
            if (this.controlXY.x === '' || reset) {
                newLeft = $(this.controlXY.selector).offset().left + $(this.controlXY.selector).width() + 10;
            } else {
                newLeft = $(this.controlXY.selector).offset().left + this.controlXY.x;
            }

            return {x: newLeft, y: newTop};
        } catch (err) {
            gm.log("ERROR in GetControlXY: " + err);
            return {x: 0, y: 0};
        }
    },

    dashboardXY: {
        selector: '#app46755028429_app_body_container',
        x: 0,
        y: 0
    },

    GetDashboardXY: function (reset) {
        try {
            var newTop = 0;
            if (reset) {
                newTop = $(this.dashboardXY.selector).offset().top - 10;
            } else {
                newTop = this.dashboardXY.y;
            }

            var newLeft = 0;
            if (this.dashboardXY.x === '' || reset) {
                newLeft = $(this.dashboardXY.selector).offset().left;
            } else {
                newLeft = $(this.dashboardXY.selector).offset().left + this.dashboardXY.x;
            }

            return {x: newLeft, y: newTop};
        } catch (err) {
            gm.log("ERROR in GetDashboardXY: " + err);
            return {x: 0, y: 0};
        }
    },

    SetControls: function () {
        try {
            // If unable to read in gm.values, then reload the page
            if (gm.getValue('caapPause', 'none') !== 'none' && gm.getValue('caapPause', 'none') !== 'block') {
                gm.log('Refresh page because unable to load gm.values due to unsafewindow error');
                this.VisitUrl(window.location.href);
            }

            // Get rid of those ads now! :P
            if (gm.getValue('HideAds', false)) {
                $('.UIStandardFrame_SidebarAds').css('display', 'none');
            }

            // Can create a blank space above the game to host the dashboard if wanted.
            // Dashboard currently uses '185px'
            var shiftDown = gm.getValue('ShiftDown', '');
            if (shiftDown) {
                $(this.controlXY.selector).css('padding-top', shiftDown);
            }

            var caapDiv = "<div id='caap_div'>";
            for (var divID in this.divList) {
                if (this.divList.hasOwnProperty(divID)) {
                    caapDiv += "<div id='caap_" + this.divList[divID] + "'></div>";
                }
            }
            caapDiv += "</div>";

            this.controlXY.x = gm.getValue('caap_div_menuLeft', '');
            this.controlXY.y = gm.getValue('caap_div_menuTop', $(this.controlXY.selector).offset().top);
            var styleXY = this.GetControlXY();
            $(caapDiv).css({
                width: '180px',
                background: gm.getValue('StyleBackgroundLight', '#E0C691'),
                opacity: gm.getValue('StyleOpacityLight', '1'),
                color: '#000',
                padding: "4px",
                border: "2px solid #444",
                top: styleXY.y + 'px',
                left: styleXY.x + 'px',
                zIndex: gm.getValue('caap_div_zIndex', '2'),
                position: 'absolute'
            }).appendTo(document.body);

            this.CheckLastAction(gm.getValue('LastAction', 'none'));

            var htmlCode = '';
            if (global.is_chrome) {
                htmlCode += "<div id='caapPausedDiv' style='display: none'><a href='javascript:;' id='caapPauseA' >Pause</a></div>";
            }

            htmlCode += "<div id='caapPaused' style='display: " + gm.getValue('caapPause', 'block') + "'><b>Paused on mouse click.</b><br /><a href='javascript:;' id='caapRestart' >Click here to restart</a></div>";
            var autoRunInstructions = "Disable auto running of CAAP. Stays persistent even on page reload and the autoplayer will not autoplay.";
            htmlCode += "<hr /><table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR("Disable Autoplayer", 'Disabled', false, '', autoRunInstructions) + '</table>';
            var bankInstructions0 = "Minimum cash to keep in the bank. Press tab to save";
            var bankInstructions1 = "Minimum cash to have on hand, press tab to save";
            var bankInstructions2 = "Maximum cash to have on hand, bank anything above this, press tab to save (leave blank to disable).";
            var healthInstructions = "Minimum health to have before healing, press tab to save (leave blank to disable).";
            var healthStamInstructions = "Minimum Stamina to have before healing, press tab to save (leave blank to disable).";
            var bankImmedInstructions = "Bank as soon as possible. May interrupt player and monster battles.";
            var autobuyInstructions = "Automatically buy lands in groups of 10 based on best Return On Investment value.";
            var autosellInstructions = "Automatically sell off any excess lands above your level allowance.";
            htmlCode += '<hr />' + this.ToggleControl('CashandHealth', 'CASH and HEALTH');
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR("Bank Immediately", 'BankImmed', false, '', bankImmedInstructions);
            htmlCode += this.MakeCheckTR("Auto Buy Lands", 'autoBuyLand', false, '', autobuyInstructions);
            htmlCode += this.MakeCheckTR("Auto Sell Excess Lands", 'SellLands', false, '', autosellInstructions) + '</table>';
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Keep In Bank</td><td style='text-align: right'>$" + this.MakeNumberForm('minInStore', bankInstructions0, 100000, "type='text' size='12' style='font-size: 10px; text-align: right'") + "</td></tr></table>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Bank Above</td><td style='text-align: right'>$" + this.MakeNumberForm('MaxInCash', bankInstructions2, '', "type='text' size='7' style='font-size: 10px; text-align: right'") + "</td></tr>";
            htmlCode += "<tr><td style='padding-left: 10px'>But Keep On Hand</td><td style='text-align: right'>$" + this.MakeNumberForm('MinInCash', bankInstructions1, '', "type='text' size='7' style='font-size: 10px; text-align: right'") + "</td></tr></table>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Heal If Health Below</td><td style='text-align: right'>" + this.MakeNumberForm('MinToHeal', healthInstructions, 10, "size='2' style='font-size: 10px; text-align: right'") + "</td></tr>";
            htmlCode += "<tr><td style='padding-left: 10px'>But Not If Stamina Below</td><td style='text-align: right'>" + this.MakeNumberForm('MinStamToHeal', healthStamInstructions, '', "size='2' style='font-size: 10px; text-align: right'") + '</td></tr></table>';
            htmlCode += "<hr/></div>";

            var forceSubGen = "Always do a quest with the Subquest General you selected under the Generals section. NOTE: This will keep the script from automatically switching to the required general for experience of primary quests.";
            htmlCode += this.ToggleControl('Quests', 'QUEST');

            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td width=80>Quest When</td><td style='text-align: right; width: 60%'>" + this.MakeDropDown('WhenQuest', this.questWhenList, '', "style='font-size: 10px; width: 100%'") + '</td></tr></table>';
            htmlCode += "<div id='caap_WhenQuestHide' style='display: " + (gm.getValue('WhenQuest', false) != 'Never' ? 'block' : 'none') + "'>";

            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Quest Area</td><td style='text-align: right; width: 60%'>" + this.MakeDropDown('QuestArea', this.questAreaList, '', "style='font-size: 10px; width: 100%'") + '</td></tr>';
            switch (gm.getValue('QuestArea', this.questAreaList[0])) {
            case 'Quest' :
                htmlCode += "<tr id='trQuestSubArea' style='display: table-row'><td>Sub Area</td><td style='text-align: right; width: 60%'>" + this.MakeDropDown('QuestSubArea', this.landQuestList, '', "style='font-size: 10px; width: 100%'") + '</td></tr>';
                break;
            case 'Demi Quests' :
                htmlCode += "<tr id='trQuestSubArea' style='display: table-row'><td>Sub Area</td><td style='text-align: right; width: 60%'>" + this.MakeDropDown('QuestSubArea', this.demiQuestList, '', "style='font-size: 10px; width: 100%'") + '</td></tr>';
                break;
            default :
                gm.deleteValue('QuestSubArea');
                htmlCode += "<tr id='trQuestSubArea' style='display: none'><td>Sub Area</td><td style='text-align: right; width: 60%'>" + this.MakeDropDown('QuestSubArea', this.atlantisQuestList, '', "style='font-size: 10px; width: 100%'") + '</td></tr>';
                break;
            }

            htmlCode += "<tr><td>Quest For</td><td style='text-align: right; width: 60%'>" + this.MakeDropDown('WhyQuest', this.questForList, '', "style='font-size: 10px; width: 100%'") + '</td></tr></table>';
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR("Switch Quest Area", 'swithQuestArea', false, '', 'Allows switching quest area after Advancement or Max Influence');
            htmlCode += this.MakeCheckTR("Use Only Subquest General", 'ForceSubGeneral', false, '', forceSubGen);
            htmlCode += this.MakeCheckTR("Quest For Orbs", 'GetOrbs', false, '', 'Perform the Boss quest in the selected land for orbs you do not have.') + "</table>";
            htmlCode += "</div>";
            var autoQuestName = gm.getObjVal('AutoQuest', 'name');
            if (autoQuestName) {
                htmlCode += "<a id='stopAutoQuest' style='display: block' href='javascript:;'>Stop auto quest: " + autoQuestName + " (energy: " + gm.getObjVal('AutoQuest', 'energy') + ")" + "</a>";
            } else {
                htmlCode += "<a id='stopAutoQuest' style='display: none' href='javascript:;'></a>";
            }
            htmlCode += "<hr/></div>";

            var XBattleInstructions = "Start battling if stamina is above this points";
            var XMinBattleInstructions = "Don't battle if stamina is below this points";
            var userIdInstructions = "User IDs(not user name).  Click with the " +
                "right mouse button on the link to the users profile & copy link." +
                "  Then paste it here and remove everything but the last numbers." +
                " (ie. 123456789)";
            var chainBPInstructions = "Number of battle points won to initiate a " +
                "chain attack. Specify 0 to always chain attack.";
            var chainGoldInstructions = "Amount of gold won to initiate a chain " +
                "attack. Specify 0 to always chain attack.";
            var FMRankInstructions = "The lowest relative rank below yours that " +
                "you are willing to spend your stamina on. Leave blank to attack " +
                "any rank.";
            var FMARBaseInstructions = "This value sets the base for your army " +
                "ratio calculation. It is basically a multiplier for the army " +
                "size of a player at your equal level. A value of 1 means you " +
                "will battle an opponent the same level as you with an army the " +
                "same size as you or less. Default .5";
            var dontbattleInstructions = "Remember an opponents id after a loss " +
                "and don't battle him again";
            var plusonekillsInstructions = "Force +1 kill scenario if 80% or more" +
                " of targets are withn freshmeat settings. Note: Since Castle Age" +
                " choses the target, selecting this option could result in a " +
                "greater chance of loss.";
            var raidOrderInstructions = "List of search words that decide which " +
                "raids to participate in first.  Use words in player name or in " +
                "raid name. To specify max damage follow keyword with :max token " +
                "and specifiy max damage values. Use 'k' and 'm' suffixes for " +
                "thousand and million.";
            var ignorebattlelossInstructions = "Ignore battle losses and attack " +
                "regardless.  This will also delete all battle loss records.";
            htmlCode += this.ToggleControl('Battling', 'BATTLE');
            var battleList = [
                'Stamina Available',
                'At Max Stamina',
                'At X Stamina',
                'No Monster',
                'Stay Hidden',
                'Never'
            ];
            var battleInst = [
                'Stamina Available will battle whenever you have enough stamina',
                'At Max Stamina will battle when stamina is at max and will burn down all stamina when able to level up',
                'At X Stamina you can set maximum and minimum stamina to battle',
                'No Monster will battle only when there are no active monster battles',
                'Stay Hidden uses stamina to try to keep you under 10 health so you cannot be attacked, while also attempting to maximize your stamina use for Monster attacks. YOU MUST SET MONSTER OR ARENA TO "STAY HIDDEN" TO USE THIS FEATURE.',
                'Never - disables player battles'
            ];
            var typeList = [
                'Invade',
                'Duel'
            ];
            var typeInst = [
                'Battle using Invade button',
                'Battle using Duel button - no guarentee you will win though'
            ];
            var targetList = [
                'Freshmeat',
                'Userid List',
                'Raid',
                'Arena'
            ];
            var targetInst = [
                'Use settings to select a target from the Battle Page',
                'Select target from the supplied list of userids',
                'Raid Battles'
            ];
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Battle When</td><td style='text-align: right; width: 65%'>" + this.MakeDropDown('WhenBattle', battleList, battleInst, "style='font-size: 10px; width: 100%'") + '</td></tr></table>';
            htmlCode += "<div id='caap_WhenBattleStayHidden1' style='display: " + (gm.getValue('WhenBattle', false) == 'Stay Hidden' && gm.getValue('WhenMonster', false) != 'Stay Hidden' ? 'block' : 'none') + "'>";
            htmlCode += "<font color='red'><b>Warning: Monster Not Set To 'Stay Hidden'</b></font>";
            htmlCode += "</div>";
            htmlCode += "<div id='caap_WhenBattleStayHidden2' style='display: " + (gm.getValue('WhenBattle', false) == 'Stay Hidden' && gm.getValue('TargetType', false) == 'Arena' && gm.getValue('ArenaHide', false) == 'None' ? 'block' : 'none') + "'>";
            htmlCode += "<font color='red'><b>Warning: Arena Must Have 'Hide Using' Active To Support Hiding</b></font>";
            htmlCode += "</div>";
            htmlCode += "<div id='caap_WhenBattleXStamina' style='display: " + (gm.getValue('WhenBattle', false) != 'At X Stamina' ? 'none' : 'block') + "'>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Start Battles When Stamina</td><td style='text-align: right'>" + this.MakeNumberForm('XBattleStamina', XBattleInstructions, 1, "size='2' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 10px'>Keep This Stamina</td><td style='text-align: right'>" + this.MakeNumberForm('XMinBattleStamina', XMinBattleInstructions, 0, "size='2' style='font-size: 10px; text-align: right'") + '</td></tr></table>';
            htmlCode += "</div>";
            htmlCode += "<div id='caap_WhenBattleHide' style='display: " + (gm.getValue('WhenBattle', false) != 'Never' ? 'block' : 'none') + "'>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Battle Type</td><td style='text-align: right; width: 40%'>" + this.MakeDropDown('BattleType', typeList, typeInst, "style='font-size: 10px; width: 100%'") + '</td></tr></table>';
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR("Clear Complete Raids", 'clearCompleteRaids', false, '', '');
            htmlCode += this.MakeCheckTR("Ignore Battle Losses", 'IgnoreBattleLoss', false, '', ignorebattlelossInstructions);
            htmlCode += "<tr><td>Chain:Battle Points Won</td><td style='text-align: right'>" + this.MakeNumberForm('ChainBP', chainBPInstructions, '', "size='2' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td>Chain:Gold Won</td><td style='text-align: right'>" + this.MakeNumberForm('ChainGold', chainGoldInstructions, '', "size='5' style='font-size: 10px; text-align: right'") + '</td></tr></table>';
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Target Type</td><td style='text-align: right; width: 50%'>" + this.MakeDropDown('TargetType', targetList, targetInst, "style='font-size: 10px; width: 100%'") + '</td></tr></table>';
            htmlCode += "<div id='caap_FreshmeatSub' style='display: " + (gm.getValue('TargetType', false) != 'Userid List' ? 'block' : 'none') + "'>";
            htmlCode += "Attack targets that are:";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td style='padding-left: 10px'>Not Lower Than Rank Minus </td><td style='text-align: right'>" + this.MakeNumberForm('FreshMeatMinRank', FMRankInstructions, '', "size='2' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 10px'>Not Higher Than X*Army </td><td style='text-align: right'>" + this.MakeNumberForm('FreshMeatARBase', FMARBaseInstructions, "0.5", "size='2' style='font-size: 10px; text-align: right'") + '</td></tr></table>';
            htmlCode += "</div>";
            htmlCode += "<div id='caap_RaidSub' style='display: " + (gm.getValue('TargetType', false) == 'Raid' ? 'block' : 'none') + "'>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR("Attempt +1 Kills", 'PlusOneKills', false, '', plusonekillsInstructions) + '</table>';
            htmlCode += "Join Raids in this order <a href='http://senses.ws/caap/index.php?topic=1502.0' target='_blank'><font color='red'>?</font></a><br />";
            htmlCode += this.MakeTextBox('orderraid', raidOrderInstructions, " rows='3' cols='25'");
            htmlCode += "</div>";
            var goalList = [
                '',
                'Swordsman',
                'Warrior',
                'Gladiator',
                'Hero',
                'Legend'
            ];
            typeList = [
                'None',
                'Freshmeat',
                'Raid'
            ];
            typeInst = [
                'Never switch from battling in the Arena',
                'Switch fom Arena to fresmeat battles to reduce health below specifed level',
                'Switch fom Arena to raid battles to reduce health below specifed level'
            ];
            var ArenaHealthInstructions = "If your health is below this value, " +
                "you will continue to stay in the Arena. If your health is above " +
                "this level, your stamina will be checked to see if it is above " +
                "the stamina threshold to stay in the Arena.";
            var ArenaStaminaInstructions = "If your stamina is above this value, " +
                "you will continue to stay in the Arena. If your stamina is " +
                "below this level, your health will be checked to see if it is " +
                "below the health thershold for you to stay in the Arena. ";
            htmlCode += "<div id='caap_ArenaSub' style='display: " + (gm.getValue('TargetType', false) == 'Arena' ? 'block' : 'none') + "'>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Maintain Rank</td><td style='text-align: right; width : 50%'>" + this.MakeDropDown('ArenaGoal', goalList, '', "style='font-size: 10px; width : 100%'") + '</td></tr>';
            htmlCode += "<tr><td>Hide Using</td><td style='text-align: right; width : 50%'>" + this.MakeDropDown('ArenaHide', typeList, typeInst, "style='font-size: 10px; width : 100%'") + '</td></tr></table>';
            htmlCode += "<div id='caap_ArenaHSub' style='display: " + (gm.getValue('ArenaHide', false) == 'None' ? 'none' : 'block') + "'>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td style='padding-left: 10px'>Arena If Health Below</td><td style='text-align: right'>" + this.MakeNumberForm('ArenaMaxHealth', ArenaHealthInstructions, "20", "size='2' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 10px'><b>OR</b></td><td></td></tr>";
            htmlCode += "<tr><td style='padding-left: 10px'>Arena If Stamina Above</td><td style='text-align: right'>" + this.MakeNumberForm('ArenaMinStamina', ArenaStaminaInstructions, "35", "size='2' style='font-size: 10px; text-align: right'") + '</td></tr></table>';
            htmlCode += "</div>";
            htmlCode += "</div>";
            htmlCode += "<div align=right id='caap_UserIdsSub' style='display: " + (gm.getValue('TargetType', false) == 'Userid List' ? 'block' : 'none') + "'>";
            htmlCode += this.MakeTextBox('BattleTargets', userIdInstructions, " rows='3' cols='25'");
            htmlCode += "</div>";
            htmlCode += "</div>";
            htmlCode += "<hr/></div>";

            var XMonsterInstructions = "Start attacking if stamina is above this points";
            var XMinMonsterInstructions = "Don't attack if stamina is below this points";
            var attackOrderInstructions = "List of search words that decide which monster to attack first.  Use words in player name or in monster name. To specify max damage follow keyword with :max token and specifiy max damage values. Use 'k' and 'm' suffixes for thousand and million. To override achievement use the ach: token and specify damage values.";
            var fortifyInstructions = "Fortify if ship health is below this % (leave blank to disable)";
            var questFortifyInstructions = "Do Quests if ship health is above this % and quest mode is set to Not Fortify (leave blank to disable)";
            var stopAttackInstructions = "Don't attack if ship health is below this % (leave blank to disable)";
            var monsterachieveInstructions = "Check if monsters have reached achievement damage level first. Switch when achievement met.";
            var demiPointsFirstInstructions = "Don't attack monsters until you've gotten all your demi points from battling.";
            var powerattackInstructions = "Use power attacks. Only do normal attacks if power attack not possible";
            var dosiegeInstructions = "Turns on or off automatic siege assist for all monsters and raids.";
            htmlCode += this.ToggleControl('Monster', 'MONSTER');
            var mbattleList = [
                'Stamina Available',
                'At Max Stamina',
                'At X Stamina',
                'Stay Hidden',
                'Never'
            ];
            var mbattleInst = [
                'Stamina Available will attack whenever you have enough stamina',
                'At Max Stamina will attack when stamina is at max and will burn down all stamina when able to level up',
                'At X Stamina you can set maximum and minimum stamina to battle',
                'Stay Hidden uses stamina to try to keep you under 10 health so you cannot be attacked, while also attempting to maximize your stamina use for Monster attacks. YOU MUST SET BATTLE WHEN TO "STAY HIDDEN" TO USE THIS FEATURE.',
                'Never - disables attacking monsters'
            ];
            var monsterDelayInstructions = "Max random delay to battle monsters";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td style='width: 35%'>Attack When</td><td style='text-align: right'>" + this.MakeDropDown('WhenMonster', mbattleList, mbattleInst, "style='font-size: 10px; width: 100%;'") + '</td></tr></table>';
            htmlCode += "<div id='caap_WhenMonsterXStamina' style='display: " + (gm.getValue('WhenMonster', false) != 'At X Stamina' ? 'none' : 'block') + "'>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Battle When Stamina</td><td style='text-align: right'>" + this.MakeNumberForm('XMonsterStamina', XMonsterInstructions, 1, "size='3' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 10px'>Keep This Stamina</td><td style='text-align: right'>" + this.MakeNumberForm('XMinMonsterStamina', XMinMonsterInstructions, 0, "size='3' style='font-size: 10px; text-align: right'") + '</td></tr></table>';
            htmlCode += "</div>";
            htmlCode += "<div id='caap_WhenMonsterHide' style='display: " + (gm.getValue('WhenMonster', false) != 'Never' ? 'block' : 'none') + "'>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Monster delay secs</td><td style='text-align: right'>" + this.MakeNumberForm('seedTime', monsterDelayInstructions, 300, "type='text' size='4' style='font-size: 10px; text-align: right'") + "</td></tr>";
            htmlCode += this.MakeCheckTR("Power Attack Only", 'PowerAttack', true, '', powerattackInstructions);
            htmlCode += this.MakeCheckTR("Siege weapon assist", 'DoSiege', true, '', dosiegeInstructions);
            htmlCode += this.MakeCheckTR("Clear Complete Monsters", 'clearCompleteMonsters', false, '', '');
            htmlCode += this.MakeCheckTR("Achievement Mode", 'AchievementMode', true, '', monsterachieveInstructions);
            htmlCode += this.MakeCheckTR("Get Demi Points First", 'DemiPointsFirst', false, 'DemiList', demiPointsFirstInstructions, true);

            var demiPoint = [
                'Ambrosia',
                'Malekus',
                'Corvintheus',
                'Aurora',
                'Azeron'
            ];

            var demiPtList = [
                '<img src="' + global.symbol_tiny_1 + '" height="15" width="14"/>',
                '<img src="' + global.symbol_tiny_2 + '" height="15" width="14"/>',
                '<img src="' + global.symbol_tiny_3 + '" height="15" width="14"/>',
                '<img src="' + global.symbol_tiny_4 + '" height="15" width="14"/>',
                '<img src="' + global.symbol_tiny_5 + '" height="15" width="14"/>'
            ];

            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            for (var demiPtItem in demiPtList) {
                if (demiPtList.hasOwnProperty(demiPtItem)) {
                    htmlCode += demiPtList[demiPtItem] + this.MakeCheckBox('DemiPoint' + demiPtItem, true, '', demiPoint[demiPtItem]);
                }
            }

            htmlCode += "</table>";
            htmlCode += "</div>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Fortify If Percentage Under</td><td style='text-align: right'>" + this.MakeNumberForm('MaxToFortify', fortifyInstructions, 50, "size='2' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 10px'>Quest If Percentage Over</td><td style='text-align: right'>" + this.MakeNumberForm('MaxHealthtoQuest', questFortifyInstructions, 60, "size='2' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td>No Attack If Percentage Under</td><td style='text-align: right'>" + this.MakeNumberForm('MinFortToAttack', stopAttackInstructions, 10, "size='2' style='font-size: 10px; text-align: right'") + '</td></tr></table>';
            htmlCode += "Attack Monsters in this order <a href='http://senses.ws/caap/index.php?topic=1502.0' target='_blank'><font color='red'>?</font></a><br />";
            htmlCode += this.MakeTextBox('orderbattle_monster', attackOrderInstructions, " rows='3' cols='25'");
            htmlCode += "</div>";
            htmlCode += "<hr/></div>";

            // Monster finder controls
            var monsterFinderInstructions = "When monsters are over max damage, use Monster Finder?";
            var monsterFinderStamInstructions = "Don't find new monster if stamina under this amount";
            var monsterFinderFeedMinInstructions = "Wait at least this many minutes before checking the Castle Age feed (in Facebook) (Max 120)";
            var monsterFinderFeedMaxInstructions = "If this much time has passed, always Castle Age feed (in Facebook) (argument is in minutes)";
            var monsterFinderOrderInstructions = "List of search words that decide which monster to attack first.  Can be names or monster types.";
            htmlCode += this.ToggleControl('MonsterFinder', 'MONSTER FINDER');
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR("Use Monster Finder", 'MonsterFinderUse', false, 'MonsterFinderUse_Adv', monsterFinderInstructions, true);
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Monster Find Min Stam</td><td style='text-align: right'>" + this.MakeNumberForm('MonsterFinderMinStam', monsterFinderStamInstructions, 50, "size='3' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td>Min-Check Feed (minutes)</td><td style='text-align: right'>" + this.MakeNumberForm('MonsterFinderFeedMin', monsterFinderFeedMinInstructions, 15, "size='3' style='font-size: 10px; text-align: right'") + '</td></tr></table>';
            htmlCode += "Find Monster Priority <a href='http://senses.ws/caap/index.php?topic=66.0' target='_blank'><font color='red'>?</font></a>";
            htmlCode += this.MakeTextBox('MonsterFinderOrder', monsterFinderOrderInstructions, " rows='3' cols='25'");
            htmlCode += "</div>";
            htmlCode += "<hr/></div>";

            // Recon Controls
            var PReconInstructions = "Enable player battle reconnaissance to run " +
                "as an idle background task. Battle targets will be collected and" +
                " can be displayed using the 'Target List' selection on the " +
                "dashboard.";
            var PRRankInstructions = "Provide the number of ranks below you which" +
                " recon will use to filter targets. This value will be subtracted" +
                " from your rank to establish the minimum rank that recon will " +
                "consider as a viable target. Default 3.";
            var PRLevelInstructions = "Provide the number of levels above you " +
                "which recon will use to filter targets. This value will be added" +
                " to your level to establish the maximum level that recon will " +
                "consider as a viable target. Default 10.";
            var PRARBaseInstructions = "This value sets the base for your army " +
                "ratio calculation. It is basically a multiplier for the army " +
                "size of a player at your equal level. For example, a value of " +
                ".5 means you will battle an opponent the same level as you with " +
                "an army half the size of your army or less. Default 1.";
            htmlCode += this.ToggleControl('Recon', 'RECON');
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR("Enable Player Recon", 'DoPlayerRecon', false, 'PlayerReconControl', PReconInstructions, true);
            htmlCode += 'Find battle targets that are:';
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td style='padding-left: 10px'>Not Lower Than Rank Minus</td><td style='text-align: right'>" + this.MakeNumberForm('ReconPlayerRank', PRRankInstructions, '3', "size='2' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 10px'>Not Higher Than Level Plus</td><td style='text-align: right'>" + this.MakeNumberForm('ReconPlayerLevel', PRLevelInstructions, '10', "size='2' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 10px'>Not Higher Than X*Army</td><td style='text-align: right'>" + this.MakeNumberForm('ReconPlayerARBase', PRARBaseInstructions, '1', "size='2' style='font-size: 10px; text-align: right'") + '</td></tr></table>';
            htmlCode += "</div>";
            htmlCode += "<hr/></div>";

            // Add General Comboboxes
            this.BuildGeneralLists();
            var reverseGenInstructions = "This will make the script level Generals under level 4 from Top-down instead of Bottom-up";
            htmlCode += this.ToggleControl('Generals', 'GENERALS');
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            for (var dropDownItem in this.standardGeneralList) {
                if (this.standardGeneralList.hasOwnProperty(dropDownItem)) {
                    htmlCode += '<tr><td>' + this.standardGeneralList[dropDownItem] + "</td><td style='text-align: right'>" + this.MakeDropDown(this.standardGeneralList[dropDownItem] + 'General', this.generalList, '', "style='font-size: 10px; min-width: 110px; max-width: 110px; width: 110px;'") + '</td></tr>';
                }
            }

            var LevelUpGenExpInstructions = "Specify the number of experience " +
                "points below the next level up to begin using the level up general.";
            var LevelUpGenInstructions1 = "Use the Level Up General for Idle mode.";
            var LevelUpGenInstructions2 = "Use the Level Up General for Monster mode.";
            var LevelUpGenInstructions3 = "Use the Level Up General for Fortify mode.";
            var LevelUpGenInstructions4 = "Use the Level Up General for Battle mode.";
            var LevelUpGenInstructions5 = "Use the Level Up General for doing sub-quests.";
            var LevelUpGenInstructions6 = "Use the Level Up General for doing primary quests " +
                "(Warning: May cause you not to gain influence if wrong general is equipped.)";
            htmlCode += "<tr><td>Buy</td><td style='text-align: right'>" + this.MakeDropDown('BuyGeneral', this.generalBuyList, '', "style='font-size: 10px; min-width: 110px; max-width: 110px; width: 110px;'") + '</td></tr>';
            htmlCode += "<tr><td>Income</td><td style='text-align: right'>" + this.MakeDropDown('IncomeGeneral', this.generalIncomeList, '', "style='font-size: 10px; min-width: 110px; max-width: 110px; width: 110px;'") + '</td></tr>';
            htmlCode += "<tr><td>Banking</td><td style='text-align: right'>" + this.MakeDropDown('BankingGeneral', this.generalBankingList, '', "style='font-size: 10px; min-width: 110px; max-width: 110px; width: 110px;'") + '</td></tr>';
            htmlCode += "<tr><td>Level Up</td><td style='text-align: right'>" + this.MakeDropDown('LevelUpGeneral', this.generalList, '', "style='font-size: 10px; min-width: 110px; max-width: 110px; width: 110px;'") + '</td></tr></table>';
            htmlCode += "<div id='caap_LevelUpGeneralHide' style='display: " + (gm.getValue('LevelUpGeneral', false) != 'Use Current' ? 'block' : 'none') + "'>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td>Exp To Use LevelUp Gen </td><td style='text-align: right'>" + this.MakeNumberForm('LevelUpGeneralExp', LevelUpGenExpInstructions, 20, "size='2' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += this.MakeCheckTR("Level Up Gen For Idle", 'IdleLevelUpGeneral', true, '', LevelUpGenInstructions1);
            htmlCode += this.MakeCheckTR("Level Up Gen For Monsters", 'MonsterLevelUpGeneral', true, '', LevelUpGenInstructions2);
            htmlCode += this.MakeCheckTR("Level Up Gen For Fortify", 'FortifyLevelUpGeneral', true, '', LevelUpGenInstructions3);
            htmlCode += this.MakeCheckTR("Level Up Gen For Battles", 'BattleLevelUpGeneral', true, '', LevelUpGenInstructions4);
            htmlCode += this.MakeCheckTR("Level Up Gen For SubQuests", 'SubQuestLevelUpGeneral', true, '', LevelUpGenInstructions5);
            htmlCode += this.MakeCheckTR("Level Up Gen For MainQuests", 'QuestLevelUpGeneral', true, '', LevelUpGenInstructions6);
            htmlCode += "</table></div>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR("Reverse Under Level 4 Order", 'ReverseLevelUpGenerals', false, '', reverseGenInstructions) + "</table>";
            htmlCode += "<hr/></div>";

            var statusInstructions = "Automatically increase attributes when " +
                "upgrade skill points are available.";
            var statusAdvInstructions = "USE WITH CAUTION: You can use numbers or " +
                "formulas(ie. level * 2 + 10). Variable keywords include energy, " +
                "health, stamina, attack, defense, and level. JS functions can be " +
                "used (Math.min, Math.max, etc) !!!Remember your math class: " +
                "'level + 20' not equals 'level * 2 + 10'!!!";
            var statImmedInstructions = "Update Stats Immediately";
            var attrList = [
                '',
                'Energy',
                'Attack',
                'Defense',
                'Stamina',
                'Health'
            ];
            htmlCode += this.ToggleControl('Status', 'UPGRADE SKILL POINTS');
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR("Auto Add Upgrade Points", 'AutoStat', false, 'AutoStat_Adv', statusInstructions, true);
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR("Upgrade Immediately", 'StatImmed', false, '', statImmedInstructions);
            htmlCode += this.MakeCheckTR("Advanced Settings <a href='http://userscripts.org/posts/207279' target='_blank'><font color='red'>?</font></a>", 'AutoStatAdv', false, '', statusAdvInstructions) + "</table>";
            htmlCode += "<div id='caap_Status_Normal' style='display: " + (gm.getValue('AutoStatAdv', false) ? 'none' : 'block') + "'>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td style='width: 25%; text-align: right'>Increase</td><td style='width: 50%; text-align: center'>" + this.MakeDropDown('Attribute1', attrList, '', "style='font-size: 10px'") + "</td><td style='width: 5%; text-align: center'>to</td><td style='width: 20%; text-align: right'>" + this.MakeNumberForm('AttrValue1', statusInstructions, 0, "type='text' size='3' style='font-size: 10px; text-align: right'") + " </td></tr>";
            htmlCode += "<tr><td style='width: 25%; text-align: right'>Then</td><td style='width: 50%; text-align: center'>" + this.MakeDropDown('Attribute2', attrList, '', "style='font-size: 10px'") + "</td><td style='width: 5%; text-align: center'>to</td><td style='width: 20%; text-align: right'>" + this.MakeNumberForm('AttrValue2', statusInstructions, 0, "type='text' size='3' style='font-size: 10px; text-align: right'") + " </td></tr>";
            htmlCode += "<tr><td style='width: 25%; text-align: right'>Then</td><td style='width: 50%; text-align: center'>" + this.MakeDropDown('Attribute3', attrList, '', "style='font-size: 10px'") + "</td><td style='width: 5%; text-align: center'>to</td><td style='width: 20%; text-align: right'>" + this.MakeNumberForm('AttrValue3', statusInstructions, 0, "type='text' size='3' style='font-size: 10px; text-align: right'") + " </td></tr>";
            htmlCode += "<tr><td style='width: 25%; text-align: right'>Then</td><td style='width: 50%; text-align: center'>" + this.MakeDropDown('Attribute4', attrList, '', "style='font-size: 10px'") + "</td><td style='width: 5%; text-align: center'>to</td><td style='width: 20%; text-align: right'>" + this.MakeNumberForm('AttrValue4', statusInstructions, 0, "type='text' size='3' style='font-size: 10px; text-align: right'") + " </td></tr>";
            htmlCode += "<tr><td style='width: 25%; text-align: right'>Then</td><td style='width: 50%; text-align: center'>" + this.MakeDropDown('Attribute5', attrList, '', "style='font-size: 10px'") + "</td><td style='width: 5%; text-align: center'>to</td><td style='width: 20%; text-align: right'>" + this.MakeNumberForm('AttrValue5', statusInstructions, 0, "type='text' size='3' style='font-size: 10px; text-align: right'") + " </td></tr></table>";
            htmlCode += "</div>";
            htmlCode += "<div id='caap_Status_Adv' style='display: " + (gm.getValue('AutoStatAdv', false) ? 'block' : 'none') + "'>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td style='width: 25%; text-align: right'>Increase</td><td style='width: 50%; text-align: center'>" + this.MakeDropDown('Attribute1', attrList, '', "style='font-size: 10px'") + "</td><td style='width: 25%; text-align: left'>using</td></tr>";
            htmlCode += "<tr><td colspan='3'>" + this.MakeNumberForm('AttrValue1', statusInstructions, 0, "type='text' size='7' style='font-size: 10px; width : 98%'") + " </td></tr>";
            htmlCode += "<tr><td style='width: 25%; text-align: right'>Then</td><td style='width: 50%; text-align: center'>" + this.MakeDropDown('Attribute2', attrList, '', "style='font-size: 10px'") + "</td><td style='width: 25%'>using</td></tr>";
            htmlCode += "<tr><td colspan='3'>" + this.MakeNumberForm('AttrValue2', statusInstructions, 0, "type='text' size='7' style='font-size: 10px; width : 98%'") + " </td></tr>";
            htmlCode += "<tr><td style='width: 25%; text-align: right'>Then</td><td style='width: 50%; text-align: center'>" + this.MakeDropDown('Attribute3', attrList, '', "style='font-size: 10px'") + "</td><td style='width: 25%'>using</td></tr>";
            htmlCode += "<tr><td colspan='3'>" + this.MakeNumberForm('AttrValue3', statusInstructions, 0, "type='text' size='7' style='font-size: 10px; width : 98%'") + " </td></tr>";
            htmlCode += "<tr><td style='width: 25%; text-align: right'>Then</td><td style='width: 50%; text-align: center'>" + this.MakeDropDown('Attribute4', attrList, '', "style='font-size: 10px'") + "</td><td style='width: 25%'>using</td></tr>";
            htmlCode += "<tr><td colspan='3'>" + this.MakeNumberForm('AttrValue4', statusInstructions, 0, "type='text' size='7' style='font-size: 10px; width : 98%'") + " </td></tr>";
            htmlCode += "<tr><td style='width: 25%; text-align: right'>Then</td><td style='width: 50%; text-align: center'>" + this.MakeDropDown('Attribute5', attrList, '', "style='font-size: 10px'") + "</td><td style='width: 25%'>using</td></tr>";
            htmlCode += "<tr><td colspan='3'>" + this.MakeNumberForm('AttrValue5', statusInstructions, 0, "type='text' size='7' style='font-size: 10px; width : 98%'") + " </td></tr></table>";
            htmlCode += "</div>";
            htmlCode += "</table></div>";
            htmlCode += "<hr/></div>";

            // Other controls
            var giftInstructions = "Automatically receive and send return gifts.";
            var timeInstructions = "Use 24 hour format for displayed times.";
            var titleInstructions0 = "Set the title bar.";
            var titleInstructions1 = "Add the current action.";
            var titleInstructions2 = "Add the player name.";
            var autoCollectMAInstructions = "Auto collect your Master and Apprentice rewards.";
            var hideAdsInstructions = "Hides the sidebar adverts.";
            var autoAlchemyInstructions1 = "AutoAlchemy will combine all recipes " +
                "that do not have missing ingredients. By default, it will not " +
                "combine Battle Hearts recipes.";
            var autoAlchemyInstructions2 = "If for some reason you do not want " +
                "to skip Battle Hearts";
            var autoPotionsInstructions0 = "Enable or disable the auto consumption " +
                "of energy and stamina potions.";
            var autoPotionsInstructions1 = "Number of stamina potions at which to " +
                "begin consuming.";
            var autoPotionsInstructions2 = "Number of stamina potions to keep.";
            var autoPotionsInstructions3 = "Number of energy potions at which to " +
                "begin consuming.";
            var autoPotionsInstructions4 = "Number of energy potions to keep.";
            var autoPotionsInstructions5 = "Do not consume potions if the " +
                "experience points to the next level are within this value.";
            var autoEliteInstructions = "Enable or disable Auto Elite function";
            htmlCode += this.ToggleControl('Other', 'OTHER OPTIONS');
            var giftChoiceList = [
                'Same Gift As Received',
                'Random Gift'
            ];
            giftChoiceList = giftChoiceList.concat(gm.getList('GiftList'));
            giftChoiceList.push('Get Gift List');
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR('Use 24 Hour Format', 'use24hr', true, '', timeInstructions);
            htmlCode += this.MakeCheckTR('Set Title', 'SetTitle', false, 'SetTitle_Adv', titleInstructions0, true);
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR('&nbsp;&nbsp;&nbsp;Display Action', 'SetTitleAction', false, '', titleInstructions1);
            htmlCode += this.MakeCheckTR('&nbsp;&nbsp;&nbsp;Display Name', 'SetTitleName', false, '', titleInstructions2) + '</td></tr></table>';
            htmlCode += '</div>';
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR('Hide Sidebar Adverts', 'HideAds', false, '', hideAdsInstructions);
            htmlCode += this.MakeCheckTR('Auto Collect MA', 'AutoCollectMA', true, '', autoCollectMAInstructions);
            htmlCode += this.MakeCheckTR('Auto Alchemy', 'AutoAlchemy', false, 'AutoAlchemy_Adv', autoAlchemyInstructions1, true);
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR('&nbsp;&nbsp;&nbsp;Do Battle Hearts', 'AutoAlchemyHearts', false, '', autoAlchemyInstructions2) + '</td></tr></table>';
            htmlCode += '</div>';

            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR('Auto Potions', 'AutoPotions', false, 'AutoPotions_Adv', autoPotionsInstructions0, true);
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td style='padding-left: 10px'>Spend Stamina Potions At</td><td style='text-align: right'>" + this.MakeNumberForm('staminaPotionsSpendOver', autoPotionsInstructions1, 40, "size='2' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 10px'>Keep Stamina Potions</td><td style='text-align: right'>" + this.MakeNumberForm('staminaPotionsKeepUnder', autoPotionsInstructions2, 35, "size='2' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 10px'>Spend Energy Potions At</td><td style='text-align: right'>" + this.MakeNumberForm('energyPotionsSpendOver', autoPotionsInstructions3, 40, "size='2' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 10px'>Keep Energy Potions</td><td style='text-align: right'>" + this.MakeNumberForm('energyPotionsKeepUnder', autoPotionsInstructions4, 35, "size='2' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 10px'>Wait If Exp. To Level</td><td style='text-align: right'>" + this.MakeNumberForm('potionsExperience', autoPotionsInstructions5, 20, "size='2' style='font-size: 10px; text-align: right'") + '</td></tr></table>';
            htmlCode += '</div>';

            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR('Auto Elite Army', 'AutoElite', true, 'AutoEliteControl', autoEliteInstructions, true);
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td><input type='button' id='caap_resetElite' value='Do Now' style='font-size: 10px; width: 55px'></tr></td>";
            htmlCode += '<tr><td>' + this.MakeTextBox('EliteArmyList', "Try these UserIDs first. Use ',' between each UserID", " rows='3' cols='25'") + '</td></tr></table>';
            htmlCode += '</div>';
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += this.MakeCheckTR('Auto Return Gifts', 'AutoGift', false, 'GiftControl', giftInstructions, true);
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td style='width: 25%; padding-left: 10px'>Give</td><td style='text-align: right'>" + this.MakeDropDown('GiftChoice', giftChoiceList, '', "style='font-size: 10px; width: 100%'") + '</td></tr></table>';
            htmlCode += '</div>';
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px' style='margin-top: 3px'>";
            var autoBlessList = [
                'None',
                'Energy',
                'Attack',
                'Defense',
                'Stamina',
                'Health'
            ];
            htmlCode += "<tr><td style='width: 50%'>Auto bless</td><td style='text-align: right'>" + this.MakeDropDown('AutoBless', autoBlessList, '', "style='font-size: 10px; width: 100%'") + '</td></tr></table>';
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px' style='margin-top: 3px'>";
            var styleList = [
                'CA Skin',
                'Original',
                'Custom',
                'None'
            ];
            htmlCode += "<tr><td style='width: 50%'>Style</td><td style='text-align: right'>" + this.MakeDropDown('DisplayStyle', styleList, '', "style='font-size: 10px; width: 100%'") + '</td></tr></table>';
            htmlCode += "<div id='caap_DisplayStyleHide' style='display: " + (gm.getValue('DisplayStyle', false) == 'Custom' ? 'block' : 'none') + "'>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td style='padding-left: 10px'><b>Started</b></td><td style='text-align: right'><input type='button' id='StartedColorSelect' value='Select' style='font-size: 10px; width: 55px'></td></tr>";
            htmlCode += "<tr><td style='padding-left: 20px'>RGB Color</td><td style='text-align: right'>" + this.MakeNumberForm('StyleColorStarted', 'FFF or FFFFFF', '#123456', "type='text' size='5' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 20px'>Transparency</td><td style='text-align: right'>" + this.MakeNumberForm('StyleTransparencyStarted', '0 ~ 1', '', "type='text' size='5' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 10px'><b>Stoped</b></td><td style='text-align: right'><input type='button' id='StopedColorSelect' value='Select' style='font-size: 10px; width: 55px'></td></tr>";
            htmlCode += "<tr><td style='padding-left: 20px'>RGB Color</td><td style='text-align: right'>" + this.MakeNumberForm('StyleColorStoped', 'FFF or FFFFFF', '#123456', "type='text' size='5' style='font-size: 10px; text-align: right'") + '</td></tr>';
            htmlCode += "<tr><td style='padding-left: 20px'>Transparency</td><td style='text-align: right'>" + this.MakeNumberForm('StyleTransparencyStoped', '0 ~ 1', '', "type='text' size='5' style='font-size: 10px; text-align: right'") + '</td></tr></table>';
            htmlCode += "</div>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px' style='margin-top: 3px'>";
            htmlCode += "<tr><td><input type='button' id='caap_FillArmy' value='Fill Army' style='font-size: 10px; width: 55px'></td></tr></table>";
            htmlCode += '</div>';
            htmlCode += "<hr/></div>";
            htmlCode += "<table width='180px' cellpadding='0px' cellspacing='0px'>";
            htmlCode += "<tr><td style='width: 90%'>Unlock Menu <input type='button' id='caap_ResetMenuLocation' value='Reset' style='font-size: 10px; width: 55px'></td><td style='width: 10%; text-align: right'><input type='checkbox' id='unlockMenu' /></td></tr></table>";
            htmlCode += "Version: " + caapVersion + " - <a href='" + global.discussionURL + "' target='_blank'>CAAP Forum</a><br />";
            if (global.newVersionAvailable) {
                htmlCode += "<a href='http://github.com/Xotic750/Castle-Age-Autoplayer/raw/master/Castle-Age-Autoplayer.user.js'>Install new CAAP version: " + gm.getValue('SUC_remote_version') + "!</a>";
            }

            this.SetDivContent('control', htmlCode);

            $('head').append('<style type="text/css">' +
                '.farbtastic {' +
                  'position: relative;' +
                '}' +
                '.farbtastic * {' +
                  'position: absolute;' +
                  'cursor: crosshair;' +
                '}' +
                '.farbtastic, .farbtastic .wheel {' +
                  'width: 195px;' +
                  'height: 195px;' +
                '}' +
                '.farbtastic .color, .farbtastic .overlay {' +
                  'top: 47px;' +
                  'left: 47px;' +
                  'width: 101px;' +
                  'height: 101px;' +
                '}' +
                '.farbtastic .wheel {' +
                  'background: url(http://farbtastic.googlecode.com/svn/branches/farbtastic-1/wheel.png) no-repeat;' +
                  'width: 195px;' +
                  'height: 195px;' +
                '}' +
                '.farbtastic .overlay {' +
                  'background: url(http://farbtastic.googlecode.com/svn/branches/farbtastic-1/mask.png) no-repeat;' +
                '}' +
                '.farbtastic .marker {' +
                  'width: 17px;' +
                  'height: 17px;' +
                  'margin: -8px 0 0 -8px;' +
                  'overflow: hidden; ' +
                  'background: url(http://farbtastic.googlecode.com/svn/branches/farbtastic-1/marker.png) no-repeat;' +
                '}' +
                '</style>');

            $("<div id='caap_ColorSelectorDiv1'></div>").css({
                background: gm.getValue("StyleBackgroundLight", "white"),
                padding: "5px",
                border: "2px solid #000",
                top: (window.innerHeight / 2) - 100 + 'px',
                left: (window.innerWidth / 2) - 290 + 'px',
                zIndex: '1337',
                position: 'fixed',
                display: 'none'
            }).farbtastic('#caap_StyleColorStarted').appendTo(document.body);

            $("<div id='caap_ColorSelectorDiv2'></div>").css({
                background: gm.getValue("StyleBackgroundLight", "white"),
                padding: "5px",
                border: "2px solid #000",
                top: (window.innerHeight / 2) - 100 + 'px',
                left: (window.innerWidth / 2) + 'px',
                zIndex: '1337',
                position: 'fixed',
                display: 'none'
            }).farbtastic('#caap_StyleColorStoped').appendTo(document.body);

            /*-------------------------------------------------------------------------------------\
             Here is where we construct the HTML for our dashboard. We start by building the outer
             container and position it within the main container.
            \-------------------------------------------------------------------------------------*/
            var layout = "<div id='caap_top'>";
            /*-------------------------------------------------------------------------------------\
             Next we put in our Refresh Monster List button which will only show when we have
             selected the Monster display.
            \-------------------------------------------------------------------------------------*/
            layout += "<div id='caap_buttonMonster' style='position:absolute;top:0px;left:250px;display:" + (gm.getValue('DBDisplay', 'Monster') == 'Monster' ? 'block' : 'none') + "'> <input type='button' id='caap_refreshMonsters' value='Refresh Monster List' style='font-size: 9px; width:50; height:50'></div>";
            /*-------------------------------------------------------------------------------------\
             Next we put in the Clear Target List button which will only show when we have
             selected the Target List display
            \-------------------------------------------------------------------------------------*/
            layout += "<div id='caap_buttonTargets' style='position:absolute;top:0px;left:250px;display:" + (gm.getValue('DBDisplay', 'Monster') == 'Target List' ? 'block' : 'none') + "'> <input type='button' id='caap_clearTargets' value='Clear Targets List' style='font-size: 9px; width:50; height:50'></div>";
            /*-------------------------------------------------------------------------------------\
             Then we put in the Live Feed link since we overlay the Castle Age link.
            \-------------------------------------------------------------------------------------*/
            layout += "<div id='caap_buttonFeed' style='position:absolute;top:0px;left:0px;'><input id='caap_liveFeed' type='button' value='LIVE FEED! Your friends are calling.' style='font-size: 9px; width:50; height:50'></div>";
            /*-------------------------------------------------------------------------------------\
             We install the display selection box that allows the user to toggle through the
             available displays.
            \-------------------------------------------------------------------------------------*/
            var displayList = ['Monster', 'Target List'];
            layout += "<div id='caap_DBDisplay' style='font-size: 9px;position:absolute;top:0px;right:0px;'>Display: " + this.DBDropDown('DBDisplay', displayList, '', "style='font-size: 9px; min-width: 120px; max-width: 120px; width : 120px;'") + "</div>";
            /*-------------------------------------------------------------------------------------\
            And here we build our empty content divs.  We display the appropriate div
            depending on which display was selected using the control above
            \-------------------------------------------------------------------------------------*/
            layout += "<div id='caap_infoMonster' style='position:relative;top:15px;width:610px;height:185px;overflow:auto;display:" + (gm.getValue('DBDisplay', 'Monster') == 'Monster' ? 'block' : 'none') + "'></div>";
            layout += "<div id='caap_infoTargets1' style='position:relative;top:15px;width:610px;height:185px;overflow:auto;display:" + (gm.getValue('DBDisplay', 'Monster') == 'Target List' ? 'block' : 'none') + "'></div>";
            layout += "<div id='caap_infoTargets2' style='position:relative;top:15px;width:610px;height:185px;overflow:auto;display:" + (gm.getValue('DBDisplay', 'Monster') == 'Target Stats' ? 'block' : 'none') + "'></div>";
            layout += "</div>";
            /*-------------------------------------------------------------------------------------\
             No we apply our CSS to our container
            \-------------------------------------------------------------------------------------*/
            if (!$("#caap_top").length) {
                this.dashboardXY.x = gm.getValue('caap_top_menuLeft', '');
                this.dashboardXY.y = gm.getValue('caap_top_menuTop', $(this.dashboardXY.selector).offset().top - 10);
                styleXY = this.GetDashboardXY();
                $(layout).css({
                    background: gm.getValue("StyleBackgroundLight", "white"),
                    padding: "5px",
                    height: "185px",
                    width: "610px",
                    margin: "0 auto",
                    opacity: "1",
                    top: styleXY.y + 'px',
                    left: styleXY.x + 'px',
                    zIndex: gm.getValue('caap_top_zIndex', '1'),
                    position: 'absolute'
                }).appendTo(document.body);
            }
        } catch (e) {
            gm.log("ERROR in SetControls: " + e);
        }
    },

    /////////////////////////////////////////////////////////////////////
    //                      MONSTERS DASHBOARD
    // Display the current monsters and stats
    /////////////////////////////////////////////////////////////////////

    makeCommaValue: function (nStr) {
        nStr += '';
        var x = nStr.split('.');
        var x1 = x[0];
        var rgx = /(\d+)(\d{3})/;
        while (rgx.test(x1)) {
            x1 = x1.replace(rgx, '$1' + ',' + '$2');
        }

        return x1;
    },

    makeTd: function (text, color) {
        if (gm.getObjVal(color, 'color')) {
            color = gm.getObjVal(color, 'color');
        }

        if (!color) {
            color = 'black';
        }

        return "<td><font size=1 color='" + color + "'>" + text + "</font></td>";
    },

    UpdateDashboardWaitLog: true,

    UpdateDashboard: function () {
        try {
            if ($('#caap_top').length === 0) {
                throw "We are missing the Dashboard div!";

            }

            if (!this.oneMinuteUpdate('dashboard') && $('#caap_infoMonster').html() && $('#caap_infoMonster').html()) {
                if (this.UpdateDashboardWaitLog) {
                    gm.log("Dashboard update is waiting on oneMinuteUpdate");
                    this.UpdateDashboardWaitLog = false;
                }

                return false;
            }

            gm.log("Updating Dashboard");
            this.UpdateDashboardWaitLog = true;
            var html = "<table width=570 cellpadding=0 cellspacing=0 ><tr>";
            var displayItemList = ['Name', 'Damage', 'Damage%', 'Fort%', 'TimeLeft', 'T2K', 'Phase', 'Link'];
            for (var p in displayItemList) {
                if (displayItemList.hasOwnProperty(p)) {
                    html += "<td><b><font size=1>" + displayItemList[p] + '</font></b></td>';
                }
            }

            html += '</tr>';
            displayItemList.shift();
            var monsterList = gm.getList('monsterOl');
            monsterList.forEach(function (monsterObj) {
                var monster = monsterObj.split(global.vs)[0];
                var color = '';
                html += "<tr>";
                if (monster == gm.getValue('targetFromfortify') && caap.CheckEnergy(10, gm.getValue('WhenFortify', 'Energy Available'), 'fortify_mess')) {
                    color = 'blue';
                } else if (monster == gm.getValue('targetFromraid') || monster == gm.getValue('targetFrombattle_monster')) {
                    color = 'green';
                } else {
                    color = gm.getObjVal(monsterObj, 'color', 'black');
                }

                html += caap.makeTd(monster, color);
                displayItemList.forEach(function (displayItem) {
                    //gm.log(' displayItem '+ displayItem + ' value '+ gm.getObjVal(monster,displayItem));
                    if (displayItem == 'Phase' && color == 'grey') {
                        html += caap.makeTd(gm.getObjVal(monsterObj, 'status'), color);
                    } else {
                        var value = gm.getObjVal(monsterObj, displayItem);
                        if (value && !(displayItem == 'Fort%' && value == 101)) {
                            if (parseInt(value, 10).toString() == value) {
                                value = caap.makeCommaValue(value);
                            }

                            html += caap.makeTd(value + (displayItem.match(/%/) ? '%' : ''), color);
                        } else {
                            html += '<td></td>';
                        }
                    }
                });

                html += '</tr>';
            });

            html += '</table>';
            $("#caap_infoMonster").html(html);

            /*-------------------------------------------------------------------------------------\
            Next we build the HTML to be included into the 'caap_infoTargets1' div. We set our
            table and then build the header row.
            \-------------------------------------------------------------------------------------*/
            html = "<table width=570 cellpadding=0 cellspacing=0 ><tr>";
            var headers = ['UserId', 'Name', 'Deity#', 'Rank', 'Rank#', 'Level', 'Army', 'Last Alive'];
            var values = ['nameStr', 'deityNum', 'rankStr', 'rankNum', 'levelNum', 'armyNum', 'aliveTime'];
            for (var pp in headers) {
                if (headers.hasOwnProperty(pp)) {
                    html += "<td><b><font size=1>" + headers[pp] + '</font></b></td>';
                }
            }
            /*-------------------------------------------------------------------------------------\
            This div will hold data drom the targetsOl repository.  We step through the entries
            in targetOl and build each table row.  Our userid is 'key' so it's the first parameter
            \-------------------------------------------------------------------------------------*/
            var targetList = gm.getList('targetsOl');
            for (var i in targetList) {
                if (targetList.hasOwnProperty(i)) {
                    var targetObj = targetList[i];
                    var userid = targetObj.split(global.vs)[0];
                    html += "<tr>";
                    var link = "<a href='http://apps.facebook.com/castle_age/keep.php?user=" + userid + "'>" + userid + "</a>";
                    html += caap.makeTd(link, 'blue');
                    /*-------------------------------------------------------------------------------------\
                    We step through each of the additional values we include in the table. If a value is
                    null then we build an empty td
                    \-------------------------------------------------------------------------------------*/
                    for (var j in values) {
                        if (values.hasOwnProperty(j)) {
                            var value = gm.getObjVal(targetObj, values[j]);
                            if (!value) {
                                html += '<td></td>';
                                continue;
                            }
                            /*-------------------------------------------------------------------------------------\
                            We format the values based on the names. Names ending with Num are numbers, ending in
                            Time are date/time counts, and Str are strings. We then end the row, and finally when
                            all done end the table.  We then add the HTML to the div.
                            \-------------------------------------------------------------------------------------*/
                            if (/\S+Num/.test(values[j])) {
                                value = caap.makeCommaValue(value);
                            }

                            if (/\S+Time/.test(values[j])) {
                                var newTime = new Date(parseInt(value, 10));
                                value = (newTime.getMonth() + 1) + '/' + newTime.getDate() + ' ' + newTime.getHours() + ':' + (newTime.getMinutes() < 10 ? '0' : '') + newTime.getMinutes();
                            }

                            html += caap.makeTd(value, 'black');
                        }
                    }

                    html += '</tr>';
                }
            }

            html += '</table>';
            $("#caap_infoTargets1").html(html);
            return true;
        } catch (e) {
            gm.log("ERROR in UpdateDashboard: " + e);
            return false;
        }
    },

    /*-------------------------------------------------------------------------------------\
    AddDBListener creates the listener for our dashboard controls.
    \-------------------------------------------------------------------------------------*/
    AddDBListener: function () {
        try {
            var selectDiv = document.getElementById('caap_DBDisplay');
            if (!selectDiv) {
                this.ReloadCastleAge();
            }

            selectDiv.addEventListener('change', function (e) {
                var value = e.target.options[e.target.selectedIndex].value;
                gm.setValue('DBDisplay', value);
                switch (value) {
                case "Target List" :
                    caap.SetDisplay('infoMonster', false);
                    caap.SetDisplay('infoTargets1', true);
                    caap.SetDisplay('infoTargets2', false);
                    caap.SetDisplay('buttonMonster', false);
                    caap.SetDisplay('buttonTargets', true);
                    break;
                case "Target Stats" :
                    caap.SetDisplay('infoMonster', false);
                    caap.SetDisplay('infoTargets1', false);
                    caap.SetDisplay('infoTargets2', true);
                    caap.SetDisplay('buttonMonster', false);
                    caap.SetDisplay('buttonTargets', true);
                    break;
                case "Monster" :
                    caap.SetDisplay('infoMonster', true);
                    caap.SetDisplay('infoTargets1', false);
                    caap.SetDisplay('infoTargets2', false);
                    caap.SetDisplay('buttonMonster', true);
                    caap.SetDisplay('buttonTargets', false);
                    break;
                default :
                }

                gm.setValue('resetdashboard', true);
            }, false);

            var refreshMonsters = document.getElementById('caap_refreshMonsters');
            refreshMonsters.addEventListener('click', function (e) {
                gm.setValue('monsterReview', 0);
                gm.setValue('monsterReviewCounter', -3);
                gm.setValue('NotargetFrombattle_monster', 0);
                gm.setValue('ReleaseControl', true);
            }, false);

            var liveFeed = document.getElementById('caap_liveFeed');
            liveFeed.addEventListener('click', function (e) {
                var feedButton = nHtml.FindByAttrContains(document.body, "img", "src", "button_feed2.gif");
                if (feedButton) {
                    caap.Click(feedButton);
                } else {
                    gm.log("Could not find Live Feed button");
                }
            }, false);

            var clearTargets = document.getElementById('caap_clearTargets');
            clearTargets.addEventListener('click', function (e) {
                gm.setValue('targetsOl', '');
                gm.setValue('resetdashboard', true);
            }, false);

            return true;
        } catch (e) {
            gm.log("ERROR in AddDBListener: " + e);
            return false;
        }
    },

    /*
    shortenURL: function (long_url, callback) {
        // Called too frequently, the delay can cause the screen to flicker
        callback(long_url);
        GM_xmlhttpRequest({
            method : 'GET',
            url    : 'http://api.bit.ly/shorten?version=2.0.1&longUrl=' + encodeURIComponent(long_url) + '&login=castleage&apiKey=R_438eea4a725a25d92661bce54b17bee1&format=json&history=1',
            onload : function (response) {
                var result = eval("("+response.responseText+")");
                callback(result.results ? result.results[long_url].shortUrl : long_url);
            }
        });
    },
    */

    addExpDisplay: function () {
        try {
            var exp = $("#app46755028429_st_2_5 strong").text();
            if (!exp) {
                throw 'Unable to get text';
            }

            if (/\(/.test(exp)) {
                return false;
            }

            this.stats.exp = this.GetStatusNumbers(exp);
            $("#app46755028429_st_2_5 strong").append(" (<span style='color:red'>" + (this.stats.exp.dif) + "</span>)");
            return true;
        } catch (e) {
            gm.log("ERROR in addExpDisplay: " + e);
            return false;
        }
    },

    /////////////////////////////////////////////////////////////////////
    //                          EVENT LISTENERS
    // Watch for changes and update the controls
    /////////////////////////////////////////////////////////////////////

    SetDisplay: function (idName, setting) {
        try {
            if (setting === true) {
                $('#caap_' + idName).css('display', 'block');
            } else {
                $('#caap_' + idName).css('display', 'none');
            }

            return true;
        } catch (e) {
            gm.log("ERROR in SetDisplay: " + e);
            return false;
        }
    },

    CheckBoxListener: function (e) {
        try {
            var idName = e.target.id.replace(/caap_/i, '');
            gm.log("Change: setting '" + idName + "' to " + e.target.checked);
            gm.setValue(idName, e.target.checked);
            if (e.target.className) {
                caap.SetDisplay(e.target.className, e.target.checked);
            }

            switch (idName) {
            case "AutoStatAdv" :
                //gm.log("AutoStatAdv");
                if (e.target.value) {
                    caap.SetDisplay('Status_Normal', false);
                    caap.SetDisplay('Status_Adv', true);
                    for (var n = 1; n <= 5; n += 1) {
                        gm.setValue('AttrValue' + n, '');
                        //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                        // need to update the menus here!!!
                        //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                    }
                } else {
                    caap.SetDisplay('Status_Normal', true);
                    caap.SetDisplay('Status_Adv', false);
                    //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                    // need to update the menus here!!!
                    //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                }

                gm.deleteValue("statsMatch");
                break;
            case "HideAds" :
                //gm.log("HideAds");
                if (gm.getValue('HideAds')) {
                    $('.UIStandardFrame_SidebarAds').css('display', 'none');
                } else {
                    $('.UIStandardFrame_SidebarAds').css('display', 'block');
                }

                break;
            case "IgnoreBattleLoss" :
                //gm.log("IgnoreBattleLoss");
                if (gm.getValue('IgnoreBattleLoss')) {
                    gm.log("Ignore Battle Losses has been enabled.");
                    gm.setValue("BattlesLostList", '');
                    gm.log("Battle Lost List has been cleared.");
                }

                break;
            case "SetTitle" :
                //gm.log("SetTitle");
            case "SetTitleAction" :
                //gm.log("SetTitleAction");
            case "SetTitleName" :
                //gm.log("SetTitleName");
                if (gm.getValue('SetTitle', false)) {
                    var DocumentTitle = '';
                    if (gm.getValue('SetTitleAction', false)) {
                        var d = $('#caap_activity_mess').html();
                        if (d) {
                            DocumentTitle += d.replace("Activity: ", '') + " - ";
                        }
                    }

                    if (gm.getValue('SetTitleName', false)) {
                        DocumentTitle += gm.getValue('PlayerName', 'CAAP') + " - ";
                    }

                    document.title = DocumentTitle + global.documentTitle;
                } else {
                    document.title = global.documentTitle;
                }

                break;
            case "unlockMenu" :
                //gm.log("unlockMenu");
                if (e.target.checked) {
                    $(":input[id^='caap_']").attr({disabled: true});
                    $("#caap_div").css('cursor', 'move');
                    $("#caap_div").mousedown(Move.dragHandler);
                    $("#caap_top").css('cursor', 'move');
                    $("#caap_top").mousedown(Move.dragHandler);
                } else {
                    $(":input[id^='caap_']").attr({disabled: false});
                    $("#caap_div").css('cursor', '');
                    $("#caap_div").unbind('mousedown', Move.dragHandler);
                    $("#caap_top").css('cursor', '');
                    $("#caap_top").unbind('mousedown', Move.dragHandler);
                }

                break;
            default :
            }

            return true;
        } catch (err) {
            gm.log("ERROR in CheckBoxListener: " + e);
            return false;
        }
    },

    TextBoxListener: function (e) {
        try {
            var idName = e.target.id.replace(/caap_/i, '');
            gm.log('Change: setting "' + idName + '" to "' + e.target.value + '"');
            if (/Style*/.test(idName)) {
                gm.setValue("StyleBackgroundLight", "#" + gm.getValue("StyleColorStarted", "FFF"));
                gm.setValue("StyleOpacityLight", gm.getValue("StyleTransparencyStarted", "1"));
                gm.setValue("StyleBackgroundDark", "#" + gm.getValue("StyleColorStoped", "FFF"));
                gm.setValue("StyleOpacityDark", gm.getValue("StyleTransparencyStoped", "1"));
            } else if (/AttrValue?/.test(idName)) {
                gm.deleteValue("statsMatch");
            } else {
                if (e.target.value === '') {
                    gm.setValue(idName, '');
                } else if (!isNaN(e.target.value)) {
                    gm.setValue(idName, Number(e.target.value));
                } else {
                    gm.setValue(idName, e.target.value);
                }
            }

            return true;
        } catch (err) {
            gm.log("ERROR in TextBoxListener: " + e);
            return false;
        }
    },

    DropBoxListener: function (e) {
        try {
            if (e.target.selectedIndex > 0) {
                var idName = e.target.id.replace(/caap_/i, '');
                var value = e.target.options[e.target.selectedIndex].value;
                var title = e.target.options[e.target.selectedIndex].title;
                gm.log('Change: setting "' + idName + '" to "' + value + '" with title "' + title + '"');
                gm.setValue(idName, value);
                e.target.title = title;
                //caap.SelectDropOption(idName, value);
                if (idName == 'WhenQuest' || idName == 'WhenBattle' || idName == 'WhenMonster' || idName == 'LevelUpGeneral') {
                    caap.SetDisplay(idName + 'Hide', (value != 'Never'));
                    if (idName == 'WhenBattle' || idName == 'WhenMonster') {
                        caap.SetDisplay(idName + 'XStamina', (value == 'At X Stamina'));
                        caap.SetDisplay('WhenBattleStayHidden1', ((gm.getValue('WhenBattle', false) == 'Stay Hidden' && gm.getValue('WhenMonster', false) != 'Stay Hidden')));
                    }

                    if (idName == 'WhenBattle') {
                        caap.SetDisplay('WhenBattleStayHidden2', ((gm.getValue('WhenBattle', false) == 'Stay Hidden' && gm.getValue('TargetType', false) == 'Arena' && gm.getValue('ArenaHide', false) == 'None')));
                    }
                } else if (idName == 'QuestArea' || idName == 'QuestSubArea' || idName == 'WhyQuest') {
                    gm.setValue('AutoQuest', '');
                    caap.ClearAutoQuest();
                    if (idName == 'QuestArea') {
                        switch (value) {
                        case "Quest" :
                            $("#trQuestSubArea").css('display', 'table-row');
                            caap.ChangeDropDownList('QuestSubArea', caap.landQuestList);
                            break;
                        case "Demi Quests" :
                            $("#trQuestSubArea").css('display', 'table-row');
                            caap.ChangeDropDownList('QuestSubArea', caap.demiQuestList);
                            break;
                        case "Atlantis" :
                            $("#trQuestSubArea").css('display', 'none');
                            caap.ChangeDropDownList('QuestSubArea', []);
                            gm.deleteValue('QuestSubArea');
                            break;
                        default :
                        }
                    }
                } else if (idName == 'IdleGeneral') {
                    gm.setValue('MaxIdleEnergy', 0);
                    gm.setValue('MaxIdleStamina', 0);
                } else if (idName == 'ArenaHide') {
                    caap.SetDisplay('ArenaHSub', (value != 'None'));
                    caap.SetDisplay('WhenBattleStayHidden2', ((gm.getValue('WhenBattle', false) == 'Stay Hidden' && gm.getValue('TargetType', false) == 'Arena' && gm.getValue('ArenaHide', false) == 'None')));
                } else if (idName == 'TargetType') {
                    caap.SetDisplay('WhenBattleStayHidden2', ((gm.getValue('WhenBattle', false) == 'Stay Hidden' && gm.getValue('TargetType', false) == 'Arena' && gm.getValue('ArenaHide', false) == 'None')));
                    switch (value) {
                    case "Freshmeat" :
                        caap.SetDisplay('FreshmeatSub', true);
                        caap.SetDisplay('UserIdsSub', false);
                        caap.SetDisplay('RaidSub', false);
                        caap.SetDisplay('ArenaSub', false);
                        break;
                    case "Userid List" :
                        caap.SetDisplay('FreshmeatSub', false);
                        caap.SetDisplay('UserIdsSub', true);
                        caap.SetDisplay('RaidSub', false);
                        caap.SetDisplay('ArenaSub', false);
                        break;
                    case "Raid" :
                        caap.SetDisplay('FreshmeatSub', true);
                        caap.SetDisplay('UserIdsSub', false);
                        caap.SetDisplay('RaidSub', true);
                        caap.SetDisplay('ArenaSub', false);
                        break;
                    case "Arena" :
                        caap.SetDisplay('FreshmeatSub', true);
                        caap.SetDisplay('UserIdsSub', false);
                        caap.SetDisplay('RaidSub', false);
                        caap.SetDisplay('ArenaSub', true);
                        break;
                    default :
                        caap.SetDisplay('FreshmeatSub', true);
                        caap.SetDisplay('UserIdsSub', false);
                        caap.SetDisplay('RaidSub', false);
                        caap.SetDisplay('ArenaSub', false);
                    }
                } else if (/Attribute?/.test(idName)) {
                    gm.setValue("SkillPointsNeed", 1);
                    gm.deleteValue("statsMatch");
                } else if (idName == 'DisplayStyle') {
                    caap.SetDisplay(idName + 'Hide', (value == 'Custom'));
                    switch (value) {
                    case "CA Skin" :
                        gm.setValue("StyleBackgroundLight", "#E0C691");
                        gm.setValue("StyleBackgroundDark", "#B09060");
                        gm.setValue("StyleOpacityLight", "1");
                        gm.setValue("StyleOpacityDark", "1");
                        break;
                    case "None" :
                        gm.setValue("StyleBackgroundLight", "white");
                        gm.setValue("StyleBackgroundDark", "");
                        gm.setValue("StyleOpacityLight", "1");
                        gm.setValue("StyleOpacityDark", "1");
                        break;
                    case "Custom" :
                        gm.setValue("StyleBackgroundLight", "#" + gm.getValue("StyleColorStarted", "FFF"));
                        gm.setValue("StyleOpacityLight", gm.getValue("StyleTransparencyStarted", "1"));
                        gm.setValue("StyleBackgroundDark", "#" + gm.getValue("StyleColorStoped", "FFF"));
                        gm.setValue("StyleOpacityDark", gm.getValue("StyleTransparencyStoped", "1"));
                        break;
                    default :
                        gm.setValue("StyleBackgroundLight", "#efe");
                        gm.setValue("StyleBackgroundDark", "#fee");
                        gm.setValue("StyleOpacityLight", "1");
                        gm.setValue("StyleOpacityDark", "1");
                    }

                    var div = nHtml.FindByAttr(document.body, 'div', 'id', 'caap_top');
                    if (div) {
                        div.style.backgroundColor = gm.getValue("StyleBackgroundLight", "white");
                    }
                }
            }

            return true;
        } catch (err) {
            gm.log("ERROR in DropBoxListener: " + e);
            return false;
        }
    },

    TextAreaListener: function (e) {
        try {
            var idName = e.target.id.replace(/caap_/i, '');
            gm.log('Change: setting "' + idName + '" to "' + e.target.value + "'");
            if (idName == 'orderbattle_monster' || idName == 'orderraid') {
                gm.setValue('monsterReview', 0);
                gm.setValue('monsterReviewCounter', -3);
                gm.setValue('monsterReview', 0);
                gm.setValue('monsterReviewCounter', -3);
            }

            caap.SaveBoxText(idName);
            return true;
        } catch (err) {
            gm.log("ERROR in TextAreaListener: " + e);
            return false;
        }
    },

    PauseListener: function (e) {
        $('#caap_div').css({
            'background': gm.getValue('StyleBackgroundDark', '#fee'),
            'opacity': gm.getValue('StyleOpacityDark', '1'),
            'z-index': '3'
        });

        $('#caapPaused').css('display', 'block');
        if (global.is_chrome) {
            CE_message("paused", null, 'block');
        }

        gm.setValue('caapPause', 'block');
    },

    RestartListener: function (e) {
        $('#caapPaused').css('display', 'none');
        $('#caap_div').css({
            'background': gm.getValue('StyleBackgroundLight', '#efe'),
            'opacity': gm.getValue('StyleOpacityLight', '1'),
            'z-index': '1',
            'cursor': ''
        });

        $(":input[id*='caap_']").attr({disabled: false});
        $('#unlockMenu').attr('checked', false);

        gm.setValue('caapPause', 'none');
        if (global.is_chrome) {
            CE_message("paused", null, gm.getValue('caapPause', 'none'));
        }

        gm.setValue('ReleaseControl', true);
        gm.setValue('resetselectMonster', true);
        caap.waitingForDomLoad = false;
    },

    ResetMenuLocationListener: function (e) {
        gm.deleteValue('caap_div_menuLeft');
        gm.deleteValue('caap_div_menuTop');
        gm.deleteValue('caap_div_zIndex');
        caap.controlXY.x = '';
        caap.controlXY.y = $(caap.controlXY.selector).offset().top;
        var caap_divXY = caap.GetControlXY(true);
        $("#caap_div").css({
            'cursor' : '',
            'z-index' : '2',
            'top' : caap_divXY.y + 'px',
            'left' : caap_divXY.x + 'px'
        });

        gm.deleteValue('caap_top_menuLeft');
        gm.deleteValue('caap_top_menuTop');
        gm.deleteValue('caap_top_zIndex');
        caap.dashboardXY.x = '';
        caap.dashboardXY.y = $(caap.dashboardXY.selector).offset().top - 10;
        var caap_topXY = caap.GetDashboardXY(true);
        $("#caap_top").css({
            'cursor' : '',
            'z-index' : '1',
            'top' : caap_topXY.y + 'px',
            'left' : caap_topXY.x + 'px'
        });

        $(":input[id^='caap_']").attr({disabled: false});
    },

    FoldingBlockListener: function (e) {
        try {
            var subId = e.target.id.replace(/_Switch/i, '');
            var subDiv = document.getElementById(subId);
            if (subDiv.style.display == "block") {
                gm.log('Folding: ' + subId);
                subDiv.style.display = "none";
                e.target.innerHTML = e.target.innerHTML.replace(/-/, '+');
                gm.setValue('Control_' + subId.replace(/caap_/i, ''), "none");
            } else {
                gm.log('Unfolding: ' + subId);
                subDiv.style.display = "block";
                e.target.innerHTML = e.target.innerHTML.replace(/\+/, '-');
                gm.setValue('Control_' + subId.replace(/caap_/i, ''), "block");
            }

            return true;
        } catch (err) {
            gm.log("ERROR in FoldingBlockListener: " + e);
            return false;
        }
    },

    whatClickedURLListener: function (event) {
        var obj = event.target;
        while (obj && !obj.href) {
            obj = obj.parentNode;
        }

        if (obj && obj.href) {
            gm.setValue('clickUrl', obj.href);
        }

        //gm.log('globalContainer: ' + obj.href);
    },

    windowResizeListener: function (e) {
        if (window.location.href.indexOf('castle_age')) {
            var caap_divXY = caap.GetControlXY();
            $("#caap_div").css('left', caap_divXY.x + 'px');
            var caap_topXY = caap.GetDashboardXY();
            $("#caap_top").css('left', caap_topXY.x + 'px');
        }
    },

    AddListeners: function () {
        try {
            gm.log("Adding listeners for caap_div");
            if (!$('#caap_div')) {
                throw "Unable to find div for caap_div";
            }

            $('#caap_div input:checkbox[id^="caap_"]').change(this.CheckBoxListener);
            $('#caap_div input:text[id^="caap_"]').change(this.TextBoxListener);
            $('#unlockMenu').change(this.CheckBoxListener);
            $('#caap_div select[id^="caap_"]').change(this.DropBoxListener);
            $('#caap_div textarea[id^="caap_"]').change(this.TextAreaListener);
            $('#caap_div a[id^="caap_Switch"]').click(this.FoldingBlockListener);
            $('#caap_FillArmy').click(function (e) {
                gm.setValue("FillArmy", true);
            });

            $('#StartedColorSelect').click(function (e) {
                var display = 'none';
                if ($('#caap_ColorSelectorDiv1').css('display') == 'none') {
                    display = 'block';
                }

                $('#caap_ColorSelectorDiv1').css('display', display);
            });

            $('#StopedColorSelect').click(function (e) {
                var display = 'none';
                if ($('#caap_ColorSelectorDiv2').css('display') == 'none') {
                    display = 'block';
                }

                $('#caap_ColorSelectorDiv2').css('display', display);
            });

            $('#caap_ResetMenuLocation').click(this.ResetMenuLocationListener);
            $('#caap_resetElite').click(function (e) {
                gm.setValue('AutoEliteGetList', 0);
            });

            $('#caapRestart').click(this.RestartListener);
            $('#caap_control').mousedown(this.PauseListener);
            if (global.is_chrome) {
                $('#caap_control').mousedown(this.PauseListener);
            }

            $('#stopAutoQuest').click(function (e) {
                gm.setValue('AutoQuest', '');
                gm.setValue('WhyQuest', 'Manual');
                gm.log('Change: setting stopAutoQuest and go to Manual');
                caap.ManualAutoQuest();
            });

            if (!$('#app46755028429_globalContainer')) {
                throw 'Global Container not found';
            }

            // Fires when CAAP navigates to new location
            $('#app46755028429_globalContainer').find('a').bind('click', this.whatClickedURLListener);

            $('#app46755028429_globalContainer').bind('DOMNodeInserted', function (event) {
                // Uncomment this to see the id of domNodes that are inserted
                /*
                if (event.target.id) {
                    caap.SetDivContent('debug2_mess', event.target.id.replace('app46755028429_', ''));
                    //alert(event.target.id);
                }
                */

                var $target = $(event.target);
                if ($target.is("#app46755028429_app_body") ||
                    $target.is("#app46755028429_index") ||
                    $target.is("#app46755028429_keep") ||
                    $target.is("#app46755028429_generals") ||
                    $target.is("#app46755028429_battle_monster") ||
                    $target.is("#app46755028429_battle") ||
                    $target.is("#app46755028429_battlerank") ||
                    $target.is("#app46755028429_battle_train") ||
                    $target.is("#app46755028429_arena") ||
                    $target.is("#app46755028429_quests") ||
                    $target.is("#app46755028429_raid") ||
                    $target.is("#app46755028429_symbolquests") ||
                    $target.is("#app46755028429_alchemy") ||
                    $target.is("#app46755028429_soldiers") ||
                    $target.is("#app46755028429_item") ||
                    $target.is("#app46755028429_land") ||
                    $target.is("#app46755028429_magic") ||
                    $target.is("#app46755028429_oracle") ||
                    $target.is("#app46755028429_symbols") ||
                    $target.is("#app46755028429_treasure_chest") ||
                    $target.is("#app46755028429_gift") ||
                    $target.is("#app46755028429_apprentice") ||
                    $target.is("#app46755028429_news") ||
                    $target.is("#app46755028429_friend_page") ||
                    $target.is("#app46755028429_comments") ||
                    $target.is("#app46755028429_army") ||
                    $target.is("#app46755028429_army_news_feed") ||
                    $target.is("#app46755028429_army_reqs")) {

                    caap.waitingForDomLoad = false;

                    // Update experience and display
                    caap.addExpDisplay();

                    //gm.log("Refreshing DOM Listeners");
                    $('#app46755028429_globalContainer').find('a').unbind('click', caap.whatClickedURLListener);
                    $('#app46755028429_globalContainer').find('a').bind('click', caap.whatClickedURLListener);


                    caap.node_trigger = window.setTimeout(function () {
                        caap.node_trigger = null;
                        caap.CheckResults();
                    }, 100);

                    //nHtml.setTimeout(caap.CheckResults, 0);
                }

                // Reposition the dashboard
                if ($target.is(caap.dashboardXY.selector)) {
                    var caap_topXY = caap.GetDashboardXY();
                    $("#caap_top").css('left', caap_topXY.x + 'px');
                }
            });

            $(window).unbind('resize', this.windowResizeListener);
            $(window).bind('resize', this.windowResizeListener);

            /*-------------------------------------------------------------------------------------\
            We add our listener for the Display Select control.
            \-------------------------------------------------------------------------------------*/
            this.AddDBListener();
            //gm.log("Listeners added for CAAP");
            return true;
        } catch (e) {
            gm.log("ERROR in AddListeners: " + e);
            return false;
        }
    },

    /////////////////////////////////////////////////////////////////////
    //                          GET STATS
    // Functions that records all of base game stats, energy, stamina, etc.
    /////////////////////////////////////////////////////////////////////

    // Can now accept a 'node' or text in the formay '123/234'
    GetStatusNumbers: function (node) {
        try {
            if (!node) {
                throw 'No "node" supplied';
            }

            var txtArr = null;
            var num = null;
            var max = null;
            var dif = null;

            if (typeof node != 'string') {
                var txt = nHtml.GetText(node);
                if (!txt) {
                    throw 'No text found';
                }

                txtArr = this.statusRe.exec(txt);
                if (!txtArr) {
                    throw 'Cannot find status:' + txt;
                }

                num = parseInt(txtArr[1], 10);
                max = parseInt(txtArr[2], 10);
                dif = parseInt(txtArr[2], 10) - parseInt(txtArr[1], 10);
            } else {
                txtArr = node.split('/');
                if (txtArr.length !== 2) {
                    throw 'String did not split into 2 parts';
                }

                num = parseInt(txtArr[0], 10);
                max = parseInt(txtArr[1], 10);
                dif = parseInt(txtArr[1], 10) - parseInt(txtArr[0], 10);
            }

            return {
                'num': num,
                'max': max,
                'dif': dif
            };
        } catch (e) {
            gm.log("ERROR in GetStatusNumbers: " + e);
            return {
                'num': 0,
                'max': 0,
                'dif': 0
            };
        }
    },

    GetStats: function () {
        try {
            this.stats = {};
            if (!global.is_firefox) {
                if (document.getElementById('app46755028429_healForm')) {
                    // Facebook ID
                    var webSlice = nHtml.FindByAttrContains(document.body, "a", "href", "party.php");
                    if (webSlice) {
                        var fbidm = this.userRe.exec(webSlice.getAttribute('href'));
                        if (fbidm) {
                            var txtFBID = fbidm[2];
                            gm.setValue('FBID', txtFBID);
                        }
                    }
                }
            }

            // rank
            var attrDiv = nHtml.FindByAttrContains(document.body, "div", "class", 'keep_stat_title');
            if (attrDiv) {
                var txtRank = nHtml.GetText(attrDiv);
                var rankm = this.rankRe.exec(txtRank);
                if (rankm) {
                    var rank = this.rankTable[rankm[1].toString().toLowerCase().trim()];
                    if (rank !== undefined) {
                        this.stats.rank = rank;
                        gm.setValue('MyRank', this.stats.rank);
                        this.JustDidIt('MyRankLast');
                    } else {
                        gm.log("Unknown rank " + rank + ':' + rankm[1].toString());
                    }
                }

                var userName = txtRank.match(new RegExp("\"(.+)\""));
                gm.setValue('PlayerName', userName[1]);
            }

            // health
            var health = nHtml.FindByAttrContains(document.body, "span", "id", '_current_health');
            var healthMess = '';
            if (!health) {
                health = nHtml.FindByAttrXPath(document.body, 'span', "contains(@id,'_health') and not(contains(@id,'health_time'))");
            }

            this.stats.health = this.GetStatusNumbers(health.parentNode);
            if (this.stats.health) {
                healthMess = "Health: " + this.stats.health.num;
            }

            // stamina
            this.stats.stamina = null;
            var stamina = nHtml.FindByAttrContains(document.body, "span", "id", '_current_stamina');
            var staminaMess = '';
            if (!stamina) {
                stamina = nHtml.FindByAttrXPath(document.body, 'span', "contains(@id,'_stamina') and not(contains(@id,'stamina_time'))");
            }

            this.stats.stamina = this.GetStatusNumbers(stamina.parentNode);

            // energy
            var energyMess = '';
            var energy = nHtml.FindByAttrContains(document.body, "span", "id", '_current_energy');
            if (!energy) {
                energy = nHtml.FindByAttrXPath(document.body, 'span', "contains(@id,'_energy') and not(contains(@id,'energy_time'))");
            }

            this.stats.energy = this.GetStatusNumbers(energy.parentNode);

            // level
            var level = nHtml.FindByAttrContains(document.body, "div", "title", 'experience points');
            var levelMess = '';
            var txtlevel = nHtml.GetText(level);
            var levelm = this.levelRe.exec(txtlevel);
            if (levelm) {
                this.stats.level = parseInt(levelm[1], 10);
                levelMess = "Level: " + this.stats.level;
                if (gm.getValue('Level', 0) != this.stats.level) {
                    gm.deleteValue('BestLandCost');
                }

                gm.setValue('Level', this.stats.level);
            } else {
                gm.log('Could not find level re');
            }

            this.stats.rank = parseInt(gm.getValue('MyRank'), 10);

            // army
            var td = nHtml.FindByAttrContains(document.body, "div", "id", "main_bntp");
            var a = nHtml.FindByAttrContains(td, "a", "href", "army");
            var txtArmy = nHtml.GetText(a);
            var armym = this.armyRe.exec(txtArmy);
            if (armym) {
                var army = parseInt(armym[1], 10);
                army = Math.min(army, 501);
                this.stats.army = army;
                var armyMess = "Army: " + this.stats.army;
            } else {
                gm.log("Can't find armyRe in " + txtArmy);
            }

            // gold
            var cashObj = nHtml.FindByAttrXPath(document.body, "strong", "contains(string(),'$')");
            var cashTxt = nHtml.GetText(cashObj);
            var cash = this.NumberOnly(cashTxt);
            this.stats.cash = cash;

            // experience
            var exp = nHtml.FindByAttrContains(document.body, 'div', 'id', 'st_2_5');
            this.stats.exp = this.GetStatusNumbers(exp);

            // time to next level
            if (this.stats.exp) {
                var expPerStamina = 2.4;
                var expPerEnergy = parseFloat(gm.getObjVal('AutoQuest', 'expRatio')) || 1.4;
                var minutesToLevel = (this.stats.exp.dif - this.stats.stamina.num * expPerStamina - this.stats.energy.num * expPerEnergy) / (expPerStamina + expPerEnergy) / 12 * 60;
                this.stats.levelTime = new Date();
                var minutes = this.stats.levelTime.getMinutes();
                minutes += minutesToLevel;
                this.stats.levelTime.setMinutes(minutes);
                this.SetDivContent('level_mess', 'Expected next level: ' + this.FormatTime(this.stats.levelTime));
            }

            if (this.DisplayTimer('DemiPointTimer')) {
                if (this.CheckTimer('DemiPointTimer')) {
                    this.SetDivContent('demipoint_mess', 'Battle demipoints cleared');
                } else {
                    this.SetDivContent('demipoint_mess', 'Next Battle DemiPts: ' + this.DisplayTimer('DemiPointTimer'));
                }
            }

            if (this.DisplayTimer('BlessingTimer')) {
                if (this.CheckTimer('BlessingTimer')) {
                    this.SetDivContent('demibless_mess', 'Demi Blessing = none');
                } else {
                    this.SetDivContent('demibless_mess', 'Next Demi Blessing: ' + this.DisplayTimer('BlessingTimer'));
                }
            }

            if (this.DisplayTimer('ArenaRankTimer')) {
                if (this.CheckTimer('ArenaRankTimer')) {
                    this.SetDivContent('arena_mess', '');
                } else {
                    this.SetDivContent('arena_mess', 'Next Arena Rank Check: ' + this.DisplayTimer('ArenaRankTimer'));
                }
            }

            // time to next paycheck
            var paytime = nHtml.FindByAttrContains(document.body, "span", "id", '_gold_time_value');
            if (paytime) {
                this.stats.paytime = nHtml.GetText(paytime).trim();
                this.stats.payminute = this.stats.paytime.substr(0, this.stats.paytime.indexOf(':'));
            }

            // return true if probably working
            return cashObj && (health !== null);
        } catch (e) {
            gm.log("ERROR GetStats: " + e);
            return false;
        }
    },

    /////////////////////////////////////////////////////////////////////
    //                          CHECK RESULTS
    // Called each iteration of main loop, this does passive checks for
    // results to update other functions.
    /////////////////////////////////////////////////////////////////////

    SetCheckResultsFunction: function (resultsFunction) {
        this.JustDidIt('SetResultsFunctionTimer');
        gm.setValue('ResultsFunction', resultsFunction);
    },

    pageList: {
        'battle_monster': {
            signaturePic: 'tab_monster_on.jpg',
            CheckResultsFunction: 'CheckResults_fightList',
            subpages: ['onMonster']
        },
        'onMonster': {
            signaturePic: 'tab_monster_active.jpg',
            CheckResultsFunction: 'CheckResults_viewFight'
        },
        'raid': {
            signaturePic: 'tab_raid_on.gif',
            CheckResultsFunction: 'CheckResults_fightList',
            subpages: ['onRaid']
        },
        'onRaid': {
            signaturePic: 'raid_back.jpg',
            CheckResultsFunction : 'CheckResults_viewFight'
        },
        'arena': {
            signaturePic: 'tab_arena_on.gif',
            CheckResultsFunction : 'CheckBattleResults'
        },
        'land': {
            signaturePic: 'tab_land_on.gif',
            CheckResultsFunction: 'CheckResults_land'
        },
        'generals': {
            signaturePic: 'tab_generals_on.gif',
            CheckResultsFunction: 'CheckResults_generals'
        },
        'quests': {
            signaturePic: 'tab_quest_on.gif',
            CheckResultsFunction: 'CheckResults_quests'
        },
        'symbolquests': {
            signaturePic: 'demi_quest_on.gif',
            CheckResultsFunction: 'CheckResults_quests'
        },
        'monster_quests': {
            signaturePic: 'tab_atlantis_on.gif',
            CheckResultsFunction: 'CheckResults_quests'
        },
        'army': {
            signaturePic: 'invite_on.gif',
            CheckResultsFunction: 'CheckResults_army'
        },
        'gift': {
            signaturePic: 'invite_on.gif',
            CheckResultsFunction: 'CheckResults_army'
        }
        /*
        ,
        'keep': {
            signaturePic: 'tab_stats_on.gif',
            CheckResultsFunction: 'CheckResults_keep'
        }
        */
    },

    trackPerformance: false,

    performanceTimer: function (marker) {
        if (!caap.trackPerformance) {
            return;
        }

        var now = (new Date().getTime());
        var elapsedTime = now - parseInt(gm.getValue('performanceTimer', 0), 10);
        gm.log('Performance Timer At ' + marker + ' Time elapsed: ' + elapsedTime);
        gm.setValue('performanceTimer', now.toString());
    },

    CheckResults: function () {
        // Check page to see if we should go to a page specific check function
        // todo find a way to verify if a function exists, and replace the array with a check_functionName exists check
        if (!this.WhileSinceDidIt('CheckResultsTimer', 1)) {
            return;
        }

        this.performanceTimer('Start CheckResults');
        this.JustDidIt('CheckResultsTimer');
        //caap.addExpDisplay();
        gm.setValue('page', '');
        var pageUrl = gm.getValue('clickUrl');
        //gm.log("Page url: " + pageUrl);
        var page = 'None';
        if (pageUrl.match(new RegExp("\/[^\/]+.php", "i"))) {
            page = pageUrl.match(new RegExp("\/[^\/]+.php", "i"))[0].replace('/', '').replace('.php', '');
            //gm.log("Page match: " + page);
        }

        if (this.pageList[page]) {
            if (this.CheckForImage(caap.pageList[page].signaturePic)) {
                page = gm.setValue('page', page);
                //gm.log("Page set value: " + page);
            }

            if (this.pageList[page].subpages) {
                this.pageList[page].subpages.forEach(function (subpage) {
                    if (caap.CheckForImage(caap.pageList[subpage].signaturePic)) {
                        page = gm.setValue('page', subpage);
                        //gm.log("Page pubpage: " + page);
                    }
                });
            }
        }

        var resultsDiv = nHtml.FindByAttrContains(document.body, 'span', 'class', 'result_body');
        var resultsText = '';
        if (resultsDiv) {
            resultsText = nHtml.GetText(resultsDiv).trim();
        }

        if (gm.getValue('page')) {
            gm.log('Checking results for ' + page);
            if (typeof caap[caap.pageList[page].CheckResultsFunction] == 'function') {
                this[this.pageList[page].CheckResultsFunction](resultsText);
            } else {
                gm.log('Check Results function not found: ' + this[this.pageList[page].CheckResultsFunction]);
            }
        } else {
            gm.log('No results check defined for ' + page);
        }

        this.performanceTimer('Before selectMonster');
        this.selectMonster();
        this.performanceTimer('Done selectMonster');
        this.UpdateDashboard();
        this.performanceTimer('Done Dashboard');

        // Check for new gifts
        if (!gm.getValue('HaveGift')) {
            if (nHtml.FindByAttrContains(document.body, 'a', 'href', 'reqs.php#confirm_')) {
                gm.log('We have a gift waiting!');
                gm.setValue('HaveGift', true);
            } else {
                var beepDiv = nHtml.FindByAttrContains(document.body, 'div', 'class', 'UIBeep_Title');
                if (beepDiv) {
                    var beepText = nHtml.GetText(beepDiv).trim();
                    if (beepText.match(/sent you a gift/) && !beepText.match(/notification/)) {
                        gm.log('We have a gift waiting');
                        gm.setValue('HaveGift', true);
                    }
                }
            }
        }

        if (!this.stats.level) {
            this.GetStats();
        }
        if (this.stats.level < 10) {
            this.battlePage = 'battle_train,battle_off';
        } else {
            this.battlePage = 'battle';
        }

        // Check for Elite Guard Add image
        if (this.CheckForImage('elite_guard_add')) {
            if (gm.getValue('AutoEliteEnd', 'NoArmy') != 'NoArmy') {
                gm.setValue('AutoEliteGetList', 0);
            }
        }

        // Check for Gold Stored
        var keepDiv = nHtml.FindByAttrContains(document.body, "div", "class", 'statsTB');
        if (keepDiv) {
            var moneyElem = nHtml.FindByAttrContains(keepDiv, "b", "class", 'money');
            if (moneyElem) {
                var goldStored = this.NumberOnly(moneyElem.firstChild.data);
                if (goldStored >= 0) {
                    // Stored as a string because Firefox about:config integer can't handle large numbers
                    gm.log("Keep: Checked the gold in store: " + gm.setValue('inStore', goldStored + ''));
                    //gm.setValue('inStore', goldStored);
                }
            }
        }

        // If set and still recent, go to the function specified in 'ResultsFunction'
        var resultsFunction = gm.getValue('ResultsFunction', '');
        if ((resultsFunction) && !this.WhileSinceDidIt('SetResultsFunctionTimer', 20)) {
            this[resultsFunction](resultsText);
        }

        this.performanceTimer('Done CheckResults');
    },

    /////////////////////////////////////////////////////////////////////
    //                          QUESTING
    // Quest function does action, DrawQuest sets up the page and gathers info
    /////////////////////////////////////////////////////////////////////

    MaxEnergyQuest: function () {
        if (!gm.getValue('MaxIdleEnergy', 0)) {
            gm.log("Changing to idle general to get Max energy");
            return this.PassiveGeneral();
        }

        if (this.stats.energy.num >= gm.getValue('MaxIdleEnergy')) {
            return this.Quests();
        }

        return false;
    },

    baseQuestTable : {
        'Land of Fire': 'land_fire',
        'Land of Earth': 'land_earth',
        'Land of Mist': 'land_mist',
        'Land of Water': 'land_water',
        'Demon Realm': 'land_demon_realm',
        'Undead Realm': 'land_undead_realm',
        'Underworld': 'tab_underworld'
    },

    demiQuestTable : {
        'Ambrosia': 'energy',
        'Malekus': 'attack',
        'Corvintheus': 'defense',
        'Aurora': 'health',
        'Azeron': 'stamina'
    },

    Quests: function () {
        if (gm.getValue('storeRetrieve', '') !== '') {
            if (gm.getValue('storeRetrieve') == 'general') {
                if (this.SelectGeneral('BuyGeneral')) {
                    return true;
                }

                gm.setValue('storeRetrieve', '');
                return true;
            } else {
                return this.RetrieveFromBank(gm.getValue('storeRetrieve', ''));
            }
        }

        this.SetDivContent('quest_mess', '');
        if (gm.getValue('WhenQuest', '') == 'Never') {
            this.SetDivContent('quest_mess', 'Questing off');
            return false;
        }

        if (gm.getValue('WhenQuest', '') == 'Not Fortifying') {
            var maxHealthtoQuest = gm.getNumber('MaxHealthtoQuest', 0);
            if (!maxHealthtoQuest) {
                this.SetDivContent('quest_mess', '<b>No valid over fortify %</b>');
                return false;
            }

            var fortMon = gm.getValue('targetFromfortify', '');
            if (fortMon) {
                this.SetDivContent('quest_mess', 'No questing until attack target ' + fortMon + " health exceeds " + gm.getNumber('MaxToFortify', 0) + '%');
                return false;
            }

            var targetFrombattle_monster = gm.getValue('targetFrombattle_monster', '');
            if (!targetFrombattle_monster) {
                var targetFort = gm.getListObjVal('monsterOl', targetFrombattle_monster, 'ShipHealth');
                if (!targetFort) {
                    if (targetFort < maxHealthtoQuest) {
                        this.SetDivContent('quest_mess', 'No questing until fortify target ' + targetFrombattle_monster + ' health exceeds ' + maxHealthtoQuest + '%');
                        return false;
                    }
                }
            }
        }

        if (!gm.getObjVal('AutoQuest', 'name')) {
            if (gm.getValue('WhyQuest', '') == 'Manual') {
                this.SetDivContent('quest_mess', 'Pick quest manually.');
                return false;
            }

            this.SetDivContent('quest_mess', 'Searching for quest.');
            gm.log("Searching for quest");
        } else {
            if (!this.CheckEnergy(gm.getObjVal('AutoQuest', 'energy'), gm.getValue('WhenQuest', 'Never'), 'quest_mess')) {
                return false;
            }
        }

        if (gm.getObjVal('AutoQuest', 'general') == 'none' || gm.getValue('ForceSubGeneral')) {
            if (this.SelectGeneral('SubQuestGeneral')) {
                return true;
            }
        }

        if (gm.getValue('LevelUpGeneral', 'Use Current') != 'Use Current' &&
            gm.getValue('QuestLevelUpGeneral', false) &&
            this.stats.exp.dif &&
            this.stats.exp.dif <= gm.getValue('LevelUpGeneralExp', 0)) {
            if (this.SelectGeneral('LevelUpGeneral')) {
                return true;
            }

            gm.log('Using level up general');
        }

        switch (gm.getValue('QuestArea', 'Quest')) {
        case 'Quest' :
            //var stageSet0 = $("#app46755028429_stage_set_0").css("display") == 'block' ? true : false;
            //var stageSet1 = $("#app46755028429_stage_set_1").css("display") == 'block' ? true : false;
            var subQArea = gm.getValue('QuestSubArea', 'Land of Fire');
            var landPic = this.baseQuestTable[subQArea];
            var imgExist = false;
            if (landPic == 'tab_underworld') {
                imgExist = this.NavigateTo('quests,jobs_tab_more.gif,' + landPic + '_small.gif', landPic + '_big');
            } else if ((landPic == 'land_demon_realm') || (landPic == 'land_undead_realm')) {
                imgExist = this.NavigateTo('quests,jobs_tab_more.gif,' + landPic + '.gif', landPic + '_sel');
            } else {
                imgExist = this.NavigateTo('quests,jobs_tab_back.gif,' + landPic + '.gif', landPic + '_sel');
            }

            if (imgExist) {
                return true;
            }

            break;
        case 'Demi Quests' :
            if (this.NavigateTo('quests,symbolquests', 'demi_quest_on.gif')) {
                return true;
            }

            var subDQArea = gm.getValue('QuestSubArea', 'Ambrosia');
            var picSlice = nHtml.FindByAttrContains(document.body, 'img', 'src', 'deity_' + this.demiQuestTable[subDQArea]);
            if (picSlice.style.height != '160px') {
                return this.NavigateTo('deity_' + this.demiQuestTable[subDQArea]);
            }

            break;
        case 'Atlantis' :
            if (!this.CheckForImage('tab_atlantis_on.gif')) {
                return this.NavigateTo('quests,monster_quests');
            }

            break;
        default :
            break;
        }

        var button = this.CheckForImage('quick_switch_button.gif');
        if (button && !gm.getValue('ForceSubGeneral', false)) {
            if (gm.getValue('LevelUpGeneral', 'Use Current') != 'Use Current' &&
                gm.getValue('QuestLevelUpGeneral', false) &&
                this.stats.exp.dif &&
                this.stats.exp.dif <= gm.getValue('LevelUpGeneralExp', 0)) {
                if (this.SelectGeneral('LevelUpGeneral')) {
                    return true;
                }
                gm.log('Using level up general');
            } else {
                gm.log('Clicking on quick switch general button.');
                this.Click(button);
                return true;
            }
        }

        var costToBuy = '';
        //Buy quest requires popup
        var itemBuyPopUp = nHtml.FindByAttrContains(document.body, "form", "id", 'itemBuy');
        if (itemBuyPopUp) {
            gm.setValue('storeRetrieve', 'general');
            if (this.SelectGeneral('BuyGeneral')) {
                return true;
            }

            gm.setValue('storeRetrieve', '');
            costToBuy = itemBuyPopUp.textContent.replace(new RegExp(".*\\$"), '').replace(new RegExp("[^0-9]{3,}.*"), '');
            gm.log("costToBuy = " + costToBuy);
            if (this.stats.cash < costToBuy) {
                //Retrieving from Bank
                if (this.stats.cash + (gm.getNumber('inStore', 0) - gm.getNumber('minInStore', 0)) >= costToBuy) {
                    gm.log("Trying to retrieve: " + (costToBuy - this.stats.cash));
                    gm.setValue("storeRetrieve", costToBuy - this.stats.cash);
                    return this.RetrieveFromBank(costToBuy - this.stats.cash);
                } else {
                    gm.setValue('AutoQuest', '');
                    gm.setValue('WhyQuest', 'Manual');
                    gm.log("Cant buy requires, stopping quest");
                    this.ManualAutoQuest();
                    return false;
                }
            }

            button = this.CheckForImage('quick_buy_button.jpg');
            if (button) {
                gm.log('Clicking on quick buy button.');
                this.Click(button);
                return true;
            }

            gm.log("Cant find buy button");
            return false;
        }

        button = this.CheckForImage('quick_buy_button.jpg');
        if (button) {
            gm.setValue('storeRetrieve', 'general');
            if (this.SelectGeneral('BuyGeneral')) {
                return true;
            }

            gm.setValue('storeRetrieve', '');
            costToBuy = button.previousElementSibling.previousElementSibling.previousElementSibling.previousElementSibling.previousElementSibling.previousElementSibling.previousElementSibling.firstChild.data.replace(new RegExp("[^0-9]", "g"), '');
            gm.log("costToBuy = " + costToBuy);
            if (this.stats.cash < costToBuy) {
                //Retrieving from Bank
                if (this.stats.cash + (gm.getNumber('inStore', 0) - gm.getNumber('minInStore', 0)) >= costToBuy) {
                    gm.log("Trying to retrieve: " + (costToBuy - this.stats.cash));
                    gm.setValue("storeRetrieve", costToBuy - this.stats.cash);
                    return this.RetrieveFromBank(costToBuy - this.stats.cash);
                } else {
                    gm.setValue('AutoQuest', '');
                    gm.setValue('WhyQuest', 'Manual');
                    gm.log("Cant buy General, stopping quest");
                    this.ManualAutoQuest();
                    return false;
                }
            }

            gm.log('Clicking on quick buy general button.');
            this.Click(button);
            return true;
        }

        var autoQuestDivs = this.CheckResults_quests(true);
        if (!gm.getObjVal('AutoQuest', 'name')) {
            gm.log('Could not find autoquest.');
            this.SetDivContent('quest_mess', 'Could not find autoquest.');
            return false;
        }

        var autoQuestName = gm.getObjVal('AutoQuest', 'name');
        if (gm.getObjVal('AutoQuest', 'name') != autoQuestName) {
            gm.log('New AutoQuest found.');
            this.SetDivContent('quest_mess', 'New AutoQuest found.');
            return true;
        }

        // if found missing requires, click to buy
        var background = nHtml.FindByAttrContains(autoQuestDivs.tr, "div", "style", 'background-color');
        if (background) {
            if (background.style.backgroundColor == 'rgb(158, 11, 15)') {
                gm.log(" background.style.backgroundColor = " + background.style.backgroundColor);
                gm.setValue('storeRetrieve', 'general');
                if (this.SelectGeneral('BuyGeneral')) {
                    return true;
                }

                gm.setValue('storeRetrieve', '');
                if (background.firstChild.firstChild.title) {
                    gm.log("Clicking to buy " + background.firstChild.firstChild.title);
                    this.Click(background.firstChild.firstChild);
                    return true;
                }
            }
        }

        var general = gm.getObjVal('AutoQuest', 'general');
        if (general == 'none' || gm.getValue('ForceSubGeneral', false)) {
            if (this.SelectGeneral('SubQuestGeneral')) {
                return true;
            }
        } else if ((general) && general != this.GetCurrentGeneral()) {
            if (gm.getValue('LevelUpGeneral', 'Use Current') != 'Use Current' &&
                gm.getValue('QuestLevelUpGeneral', false) &&
                this.stats.exp.dif &&
                this.stats.exp.dif <= gm.getValue('LevelUpGeneralExp', 0)) {
                if (this.SelectGeneral('LevelUpGeneral')) {
                    return true;
                }

                gm.log('Using level up general');
            } else {
                gm.log('Clicking on general ' + general);
                this.Click(autoQuestDivs.genDiv);
                return true;
            }
        }

        gm.log('Clicking auto quest: ' + autoQuestName);
        gm.setValue('ReleaseControl', true);
        caap.Click(autoQuestDivs.click, 10000);
        //gm.log("Quests: " + autoQuestName + " (energy: " + gm.getObjVal('AutoQuest', 'energy') + ")");
        this.ShowAutoQuest();
        return true;
    },

    questName: null,

    CheckResults_quests: function (pickQuestTF) {
        var whyQuest = gm.getValue('WhyQuest', '');
        if (pickQuestTF === true && whyQuest != 'Manual') {
            gm.setValue('AutoQuest', '');
        }

        var bestReward = 0;
        var rewardRatio = 0;
        var div = document.body;
        var ss = null;
        var s = 0;
        if (this.CheckForImage('demi_quest_on.gif')) {
            ss = document.evaluate(".//div[contains(@id,'symbol_displaysymbolquest')]",
                div, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            if (ss.snapshotLength <= 0) {
                gm.log("Failed to find symbol_displaysymbolquest");
            }

            for (s = 0; s < ss.snapshotLength; s += 1) {
                div = ss.snapshotItem(s);
                if (div.style.display != 'none') {
                    break;
                }
            }
        }

        ss = document.evaluate(".//div[contains(@class,'quests_background')]",
            div, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        if (ss.snapshotLength <= 0) {
            gm.log("Failed to find quests_background");
            return;
        }

        var bossList = ["Heart of Fire", "Gift of Earth", "Eye of the Storm", "A Look into the Darkness", "The Rift", "Undead Embrace", "Confrontation"];
        var haveOrb = false;
        if (nHtml.FindByAttrContains(div, 'input', 'src', 'alchemy_summon')) {
            haveOrb = true;
            if (bossList.indexOf(gm.getObjVal('AutoQuest', 'name')) >= 0 && gm.getValue('GetOrbs', false) && whyQuest != 'Manual') {
                gm.setValue('AutoQuest', '');
            }
        }

        var autoQuestDivs = {};
        for (s = 0; s < ss.snapshotLength; s += 1) {
            div = ss.snapshotItem(s);
            this.questName = this.GetQuestName(div);
            if (!this.questName) {
                continue;
            }

            var reward = null;
            var energy = null;
            var experience = null;
            var divTxt = nHtml.GetText(div);
            var expM = this.experienceRe.exec(divTxt);
            if (expM) {
                experience = this.NumberOnly(expM[1]);
            } else {
                var expObj = nHtml.FindByAttr(div, 'div', 'className', 'quest_experience');
                if (expObj) {
                    experience = (this.NumberOnly(nHtml.GetText(expObj)));
                } else {
                    gm.log('cannot find experience:' + this.questName);
                }
            }

            var idx = this.questName.indexOf('<br>');
            if (idx >= 0) {
                this.questName = this.questName.substring(0, idx);
            }

            var energyM = this.energyRe.exec(divTxt);
            if (energyM) {
                energy = this.NumberOnly(energyM[1]);
            } else {
                var eObj = nHtml.FindByAttrContains(div, 'div', 'className', 'quest_req');
                if (eObj) {
                    energy = eObj.getElementsByTagName('b')[0];
                }
            }

            if (!energy) {
                gm.log('cannot find energy for quest:' + this.questName);
                continue;
            }

            var moneyM = this.moneyRe.exec(this.RemoveHtmlJunk(divTxt));
            if (moneyM) {
                var rewardLow = this.NumberOnly(moneyM[1]);
                var rewardHigh = this.NumberOnly(moneyM[2]);
                reward = (rewardLow + rewardHigh) / 2;
            } else {
                gm.log('no money found:' + this.questName + ' in ' + divTxt);
            }

            var click = nHtml.FindByAttr(div, "input", "name", /^Do/);
            if (!click) {
                gm.log('no button found:' + this.questName);
                continue;
            }
            var influence = null;
            if (bossList.indexOf(this.questName) >= 0) {
                if (nHtml.FindByClassName(document.body, 'div', 'quests_background_sub')) {
                    //if boss and found sub quests
                    influence = "100";
                } else {
                    influence = "0";
                }
            } else {
                var influenceList = this.influenceRe.exec(divTxt);
                if (influenceList) {
                    influence = influenceList[1];
                } else {
                    gm.log("Influence div not found.");
                }
            }

            if (!influence) {
                gm.log('no influence found:' + this.questName + ' in ' + divTxt);
            }

            var general = 'none';
            var genDiv = null;
            if (influence && influence < 100) {
                genDiv = nHtml.FindByAttrContains(div, 'div', 'className', 'quest_act_gen');
                if (genDiv) {
                    genDiv = nHtml.FindByAttrContains(genDiv, 'img', 'src', 'jpg');
                    if (genDiv) {
                        general = genDiv.title;
                    }
                }
            }

            var questType = 'subquest';
            if (div.className == 'quests_background') {
                questType = 'primary';
            } else if (div.className == 'quests_background_special') {
                questType = 'boss';
            }

            if (s === 0) {
                gm.log("Adding Quest Labels and Listeners");
            }

            this.LabelQuests(div, energy, reward, experience, click);
            //gm.log(gm.getValue('QuestSubArea', 'Atlantis'));
            if (this.CheckCurrentQuestArea(gm.getValue('QuestSubArea', 'Atlantis'))) {
                if (gm.getValue('GetOrbs', false) && questType == 'boss' && whyQuest != 'Manual') {
                    if (!haveOrb) {
                        gm.setObjVal('AutoQuest', 'name', this.questName);
                        pickQuestTF = true;
                    }
                }

                switch (whyQuest) {
                case 'Advancement' :
                    if (influence) {
                        if (!gm.getObjVal('AutoQuest', 'name') && questType == 'primary' && this.NumberOnly(influence) < 100) {
                            gm.setObjVal('AutoQuest', 'name', this.questName);
                            pickQuestTF = true;
                        }
                    } else {
                        gm.log('cannot find influence:' + this.questName + ': ' + influence);
                    }

                    break;
                case 'Max Influence' :
                    if (influence) {
                        if (!gm.getObjVal('AutoQuest', 'name') && this.NumberOnly(influence) < 100) {
                            gm.setObjVal('AutoQuest', 'name', this.questName);
                            pickQuestTF = true;
                        }
                    } else {
                        gm.log('cannot find influence:' + this.questName + ': ' + influence);
                    }

                    break;
                case 'Max Experience' :
                    rewardRatio = (Math.floor(experience / energy * 100) / 100);
                    if (bestReward < rewardRatio) {
                        gm.setObjVal('AutoQuest', 'name', this.questName);
                        pickQuestTF = true;
                    }

                    break;
                case 'Max Gold' :
                    rewardRatio = (Math.floor(reward / energy * 10) / 10);
                    if (bestReward < rewardRatio) {
                        gm.setObjVal('AutoQuest', 'name', this.questName);
                        pickQuestTF = true;
                    }

                    break;
                default :
                }

                if (gm.getObjVal('AutoQuest', 'name') == this.questName) {
                    bestReward = rewardRatio;
                    var expRatio = experience / energy;
                    gm.log("CheckResults_quests: Setting AutoQuest");
                    gm.setValue('AutoQuest', 'name' + global.ls + this.questName + global.vs + 'energy' + global.ls + energy + global.vs + 'general' + global.ls + general + global.vs + 'expRatio' + global.ls + expRatio);
                    //gm.log("CheckResults_quests: " + gm.getObjVal('AutoQuest', 'name') + " (energy: " + gm.getObjVal('AutoQuest', 'energy') + ")");
                    this.ShowAutoQuest();
                    autoQuestDivs = {
                        'click': click,
                        'tr': div,
                        'genDiv': genDiv
                    };
                }
            }
        }

        if (pickQuestTF) {
            if (gm.getObjVal('AutoQuest', 'name')) {
                //gm.log("CheckResults_quests(pickQuestTF): " + gm.getObjVal('AutoQuest', 'name') + " (energy: " + gm.getObjVal('AutoQuest', 'energy') + ")");
                this.ShowAutoQuest();
                return autoQuestDivs;
            }

            if ((whyQuest == 'Max Influence' || whyQuest == 'Advancement') && gm.getValue('swithQuestArea', false)) { //if not find quest, probably you already maxed the subarea, try another area
                //gm.log(gm.getValue('QuestSubArea(pickQuestTF)'));
                switch (gm.getValue('QuestSubArea')) {
                case 'Land of Fire':
                    gm.setValue('QuestSubArea', 'Land of Earth');
                    break;
                case 'Land of Earth':
                    gm.setValue('QuestSubArea', 'Land of Mist');
                    break;
                case 'Land of Mist':
                    gm.setValue('QuestSubArea', 'Land of Water');
                    break;
                case 'Land of Water':
                    gm.setValue('QuestSubArea', 'Demon Realm');
                    break;
                case 'Demon Realm':
                    gm.setValue('QuestSubArea', 'Undead Realm');
                    break;
                case 'Undead Realm':
                    gm.setValue('QuestSubArea', 'Underworld');
                    break;
                case 'Underworld':
                    gm.setValue('QuestArea', 'Demi Quests');
                    gm.setValue('QuestSubArea', 'Ambrosia');
                    break;
                case 'Ambrosia':
                    gm.setValue('QuestSubArea', 'Malekus');
                    break;
                case 'Malekus':
                    gm.setValue('QuestSubArea', 'Corvintheus');
                    break;
                case 'Corvintheus':
                    gm.setValue('QuestSubArea', 'Aurora');
                    break;
                case 'Aurora':
                    gm.setValue('QuestSubArea', 'Azeron');
                    break;
                case 'Azeron':
                    gm.setValue('QuestArea', 'Quest');
                    gm.setValue('QuestSubArea', 'Land of Fire');
                    break;
                default :
                    gm.log("CheckResults_quests(default): Set quest to manual");
                    gm.setValue('AutoQuest', '');
                    gm.setValue('WhyQuest', 'Manual');
                    this.ManualAutoQuest();
                    return false;
                }

                gm.log("CheckResults_quests: Update GUI Quest areas");
                this.SelectDropOption('QuestArea', gm.getValue('QuestArea'));
                this.SelectDropOption('QuestSubArea', gm.getValue('QuestSubArea'));
                return false;
            }

            gm.log("CheckResults_quests(fall through): Set quest to manual");
            gm.setValue('AutoQuest', '');
            gm.setValue('WhyQuest', 'Manual');
            this.ManualAutoQuest();
        }
    },

    CheckCurrentQuestArea: function (QuestSubArea) {
        switch (QuestSubArea) {
        case 'Land of Fire':
            if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_1')) {
                return true;
            }

            break;
        case 'Land of Earth':
            if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_2')) {
                return true;
            }

            break;
        case 'Land of Mist':
            if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_3')) {
                return true;
            }

            break;
        case 'Land of Water':
            if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_4')) {
                return true;
            }

            break;
        case 'Demon Realm':
            if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_5')) {
                return true;
            }

            break;
        case 'Undead Realm':
            if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_6')) {
                return true;
            }

            break;
        case 'Underworld':
            if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_7')) {
                return true;
            }

            break;
        case 'Ambrosia':
            if (nHtml.FindByAttrContains(document.body, "div", "class", 'symbolquests_stage_1')) {
                return true;
            }

            break;
        case 'Malekus':
            if (nHtml.FindByAttrContains(document.body, "div", "class", 'symbolquests_stage_2')) {
                return true;
            }

            break;
        case 'Corvintheus':
            if (nHtml.FindByAttrContains(document.body, "div", "class", 'symbolquests_stage_3')) {
                return true;
            }

            break;
        case 'Aurora':
            if (nHtml.FindByAttrContains(document.body, "div", "class", 'symbolquests_stage_4')) {
                return true;
            }

            break;
        case 'Azeron':
            if (nHtml.FindByAttrContains(document.body, "div", "class", 'symbolquests_stage_5')) {
                return true;
            }

            break;
        case 'Atlantis':
            if (this.CheckForImage('tab_atlantis_on.gif')) {
                return true;
            }

            break;
        default :
            gm.log("Error: cant find QuestSubArea: " + QuestSubArea);
            return false;
        }

        return false;
    },

    GetQuestName: function (questDiv) {
        var item_title = nHtml.FindByAttrXPath(questDiv, 'div', "@class='quest_desc' or @class='quest_sub_title'");
        if (!item_title) {
            gm.log("Can't find quest description or sub-title");
            return false;
        }

        if (item_title.innerHTML.toString().match(/LOCK/)) {
            return false;
        }

        var firstb = item_title.getElementsByTagName('b')[0];
        if (!firstb) {
            gm.log("Can't get bolded member out of " + item_title.innerHTML.toString());
            return false;
        }

        this.questName = firstb.innerHTML.toString().trim().stripHTML();
        if (!this.questName) {
            //gm.log('no quest name for this row: ' + div.innerHTML);
            gm.log('no quest name for this row');
            return false;
        }

        return this.questName;
    },

    /*------------------------------------------------------------------------------------\
    CheckEnergy gets passed the default energy requirement plus the condition text from
    the 'Whenxxxxx' setting and the message div name.
    \------------------------------------------------------------------------------------*/
    CheckEnergy: function (energy, condition, msgdiv) {
        if (!this.stats.energy || !energy) {
            return false;
        }

        if (condition == 'Energy Available' || condition == 'Not Fortifying') {
            if (this.stats.energy.num >= energy) {
                return true;
            }

            if (msgdiv) {
                this.SetDivContent(msgdiv, 'Waiting for more energy: ' + this.stats.energy.num + "/" + (energy ? energy : ""));
            }
            return false;
        } else if (condition == 'At Max Energy') {
            if (!gm.getValue('MaxIdleEnergy', 0)) {
                gm.log("Changing to idle general to get Max energy");
                this.PassiveGeneral();
            }

            if (this.stats.energy.num >= gm.getValue('MaxIdleEnergy')) {
                return true;
            }

            if (this.InLevelUpMode() && this.stats.energy.num >= energy) {
                if (msgdiv) {
                    this.SetDivContent(msgdiv, 'Burning all energy to level up');
                }
                return true;
            }

            if (msgdiv) {
                this.SetDivContent(msgdiv, 'Waiting for max energy:' + this.stats.energy.num + "/" + gm.getValue('MaxIdleEnergy'));
            }
            return false;
        }

        return false;
    },

    AddLabelListener: function (element, type, listener, usecapture) {
        try {
            element.addEventListener(type, this[listener], usecapture);
            return true;
        } catch (e) {
            gm.log("ERROR in AddLabelListener: " + e);
            return false;
        }
    },

    LabelListener: function (e) {
        try {
            var sps = e.target.getElementsByTagName('span');
            if (sps.length <= 0) {
                throw 'what did we click on?';
            }

            gm.setValue('AutoQuest', 'name' + global.ls + sps[0].innerHTML.toString() + global.vs + 'energy' + global.ls + sps[1].innerHTML.toString());
            gm.setValue('WhyQuest', 'Manual');
            caap.ManualAutoQuest();
            if (caap.CheckForImage('tab_quest_on.gif')) {
                gm.setValue('QuestArea', 'Quest');
                caap.SelectDropOption('QuestArea', 'Quest');
                caap.ChangeDropDownList('QuestSubArea', caap.landQuestList);
                if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_1')) {
                    gm.setValue('QuestSubArea', 'Land of Fire');
                } else if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_2')) {
                    gm.setValue('QuestSubArea', 'Land of Earth');
                } else if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_3')) {
                    gm.setValue('QuestSubArea', 'Land of Mist');
                } else if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_4')) {
                    gm.setValue('QuestSubArea', 'Land of Water');
                } else if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_5')) {
                    gm.setValue('QuestSubArea', 'Demon Realm');
                } else if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_6')) {
                    gm.setValue('QuestSubArea', 'Undead Realm');
                } else if (nHtml.FindByAttrContains(document.body, "div", "class", 'quests_stage_7')) {
                    gm.setValue('QuestSubArea', 'Underworld');
                }

                gm.log('Seting SubQuest Area to: ' + gm.getValue('QuestSubArea'));
                caap.SelectDropOption('QuestSubArea', gm.getValue('QuestSubArea'));
            } else if (caap.CheckForImage('demi_quest_on.gif')) {
                gm.setValue('QuestArea', 'Demi Quests');
                caap.SelectDropOption('QuestArea', 'Demi Quests');
                caap.ChangeDropDownList('QuestSubArea', caap.demiQuestList);
                // Set Sub Quest Area
                if (nHtml.FindByAttrContains(document.body, "div", "class", 'symbolquests_stage_1')) {
                    gm.setValue('QuestSubArea', 'Ambrosia');
                } else if (nHtml.FindByAttrContains(document.body, "div", "class", 'symbolquests_stage_2')) {
                    gm.setValue('QuestSubArea', 'Malekus');
                } else if (nHtml.FindByAttrContains(document.body, "div", "class", 'symbolquests_stage_3')) {
                    gm.setValue('QuestSubArea', 'Corvintheus');
                } else if (nHtml.FindByAttrContains(document.body, "div", "class", 'symbolquests_stage_4')) {
                    gm.setValue('QuestSubArea', 'Aurora');
                } else if (nHtml.FindByAttrContains(document.body, "div", "class", 'symbolquests_stage_5')) {
                    gm.setValue('QuestSubArea', 'Azeron');
                }

                gm.log('Seting SubQuest Area to: ' + gm.getValue('QuestSubArea'));
                caap.SelectDropOption('QuestSubArea', gm.getValue('QuestSubArea'));
            } else if (caap.CheckForImage('tab_atlantis_on.gif')) {
                gm.log('Seting Quest Area to Atlantis');
                gm.setValue('QuestArea', 'Atlantis');
                gm.deleteValue('QuestSubArea');
                caap.SelectDropOption('QuestArea', 'Atlantis');
                caap.ChangeDropDownList('QuestSubArea', caap.landQuestList);
            }

            caap.ShowAutoQuest();
            return true;
        } catch (err) {
            gm.log("ERROR in LabelListener: " + err);
            return false;
        }
    },

    LabelQuests: function (div, energy, reward, experience, click) {
        if (nHtml.FindByAttr(div, 'div', 'className', 'autoquest')) {
            return;
        }

        div = document.createElement('div');
        div.className = 'autoquest';
        div.style.fontSize = '10px';
        div.innerHTML = "$ per energy: " + (Math.floor(reward / energy * 10) / 10) +
            "<br />Exp per energy: " + (Math.floor(experience / energy * 100) / 100) + "<br />";

        if (gm.getObjVal('AutoQuest', 'name') == this.questName) {
            var b = document.createElement('b');
            b.innerHTML = "Current auto quest";
            div.appendChild(b);
        } else {
            var setAutoQuest = document.createElement('a');
            setAutoQuest.innerHTML = 'Auto run this quest.';
            setAutoQuest.quest_name = this.questName;

            var quest_nameObj = document.createElement('span');
            quest_nameObj.innerHTML = this.questName;
            quest_nameObj.style.display = 'none';
            setAutoQuest.appendChild(quest_nameObj);

            var quest_energyObj = document.createElement('span');
            quest_energyObj.innerHTML = energy;
            quest_energyObj.style.display = 'none';
            setAutoQuest.appendChild(quest_energyObj);
            this.AddLabelListener(setAutoQuest, "click", "LabelListener", false);

            div.appendChild(setAutoQuest);
        }

        div.style.position = 'absolute';
        div.style.background = '#B09060';
        div.style.right = "144px";
        click.parentNode.insertBefore(div, click);
    },

    /////////////////////////////////////////////////////////////////////
    //                          AUTO BLESSING
    /////////////////////////////////////////////////////////////////////

    deityTable: {
        'energy': 1,
        'attack': 2,
        'defense': 3,
        'health': 4,
        'stamina': 5
    },

    BlessingResults: function (resultsText) {
        // Check time until next Oracle Blessing
        if (resultsText.match(/Please come back in: /)) {
            var hours = parseInt(resultsText.match(/ \d+ hour/), 10);
            var minutes = parseInt(resultsText.match(/ \d+ minute/), 10);
            this.SetTimer('BlessingTimer', (hours * 60 + minutes + 1) * 60);
            gm.log('Recorded Blessing Time.  Scheduling next click!');
        }

        // Recieved Demi Blessing.  Wait 24 hours to try again.
        if (resultsText.match(/You have paid tribute to/)) {
            this.SetTimer('BlessingTimer', 24 * 60 * 60 + 60);
            gm.log('Received blessing.  Scheduling next click!');
        }

        this.SetCheckResultsFunction('');
    },

    AutoBless: function () {
        var autoBless = gm.getValue('AutoBless', 'none').toLowerCase();
        if (autoBless == 'none') {
            return false;
        }

        if (!this.CheckTimer('BlessingTimer')) {
            return false;
        }

        if (this.NavigateTo('quests,demi_quest_off', 'demi_quest_bless')) {
            return true;
        }

        var picSlice = nHtml.FindByAttrContains(document.body, 'img', 'src', 'deity_' + autoBless);
        if (!picSlice) {
            gm.log('No diety pics for deity_' + autoBless);
            return false;
        }

        if (picSlice.style.height != '160px') {
            return this.NavigateTo('deity_' + autoBless);
        }

        picSlice = nHtml.FindByAttrContains(document.body, 'form', 'id', '_symbols_form_' + this.deityTable[autoBless]);
        if (!picSlice) {
            gm.log('No form for deity blessing.');
            return false;
        }

        picSlice = this.CheckForImage('demi_quest_bless', picSlice);
        if (!picSlice) {
            gm.log('No image for deity blessing.');
            return false;
        }

        gm.log('Click deity blessing for ' + autoBless);
        this.SetTimer('BlessingTimer', 60 * 60);
        this.SetCheckResultsFunction('BlessingResults');
        caap.Click(picSlice);
        return true;
    },

    /////////////////////////////////////////////////////////////////////
    //                          LAND
    // Displays return on lands and perfom auto purchasing
    /////////////////////////////////////////////////////////////////////

    LandsGetNameFromRow: function (row) {
        // schoolofmagic, etc. <div class=item_title
        var infoDiv = nHtml.FindByAttrXPath(row, 'div', "contains(@class,'land_buy_info') or contains(@class,'item_title')");
        if (!infoDiv) {
            gm.log("can't find land_buy_info");
        }

        if (infoDiv.className.indexOf('item_title') >= 0) {
            return infoDiv.textContent.trim();
        }

        var strongs = infoDiv.getElementsByTagName('strong');
        if (strongs.length < 1) {
            return null;
        }

        return strongs[0].textContent.trim();
    },

    bestLand: {
        land: '',
        roi: 0
    },

    CheckResults_land: function () {
        if (nHtml.FindByAttrXPath(document, 'div', "contains(@class,'caap_landDone')")) {
            return null;
        }

        gm.deleteValue('BestLandCost');
        this.sellLand = '';
        this.bestLand.roi = 0;
        var landByName = this.IterateLands(function (land) {
            this.SelectLands(land.row, 2);
            var roi = (parseInt((land.income / land.totalCost) * 240000, 10) / 100);
            var selects = land.row.getElementsByTagName('select');
            var div = null;
            if (!nHtml.FindByAttrXPath(land.row, 'input', "@name='Buy'")) {
                roi = 0;
                // Lets get our max allowed from the land_buy_info div
                div = nHtml.FindByAttrXPath(land.row, 'div', "contains(@class,'land_buy_info') or contains(@class,'item_title')");
                var maxText = nHtml.GetText(div).match(/:\s+\d+/i).toString().trim();
                var maxAllowed = Number(maxText.replace(/:\s+/, ''));
                // Lets get our owned total from the land_buy_costs div
                div = nHtml.FindByAttrXPath(land.row, 'div', "contains(@class,'land_buy_costs')");
                var ownedText = nHtml.GetText(div).match(/:\s+\d+/i).toString().trim();
                var owned = Number(ownedText.replace(/:\s+/, ''));
                // If we own more than allowed we will set land and selection
                var selection = [1, 5, 10];
                for (var s = 2; s >= 0; s -= 1) {
                    if (owned - maxAllowed >= selection[s]) {
                        this.sellLand = land;
                        this.sellLand.selection = s;
                        break;
                    }
                }
            }

            div = nHtml.FindByAttrXPath(land.row, 'div', "contains(@class,'land_buy_info') or contains(@class,'item_title')").getElementsByTagName('strong');
            div[0].innerHTML += " | " + roi + "% per day.";
            if (!land.usedByOther) {
                if (!(this.bestLand.roi || roi === 0) || roi > this.bestLand.roi) {
                    this.bestLand.roi = roi;
                    this.bestLand.land = land;
                    gm.setValue('BestLandCost', this.bestLand.land.cost);
                }
            }
        });

        var bestLandCost = gm.getValue('BestLandCost', '');
        gm.log("BestLandCost: " + bestLandCost);
        if (!bestLandCost) {
            gm.setValue('BestLandCost', 'none');
        }

        var div = document.createElement('div');
        div.className = 'caap_landDone';
        div.style.display = 'none';
        nHtml.FindByAttrContains(document.body, "tr", "class", 'land_buy_row').appendChild(div);
        return null;
    },

    IterateLands: function (func) {
        var content = document.getElementById('content');
        var ss = document.evaluate(".//tr[contains(@class,'land_buy_row')]", content, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        if (!ss || (ss.snapshotLength === 0)) {
            //gm.log("Can't find land_buy_row");
            return null;
        }

        var builtOnRe = new RegExp('(Built On|Consumes|Requires):\\s*([^<]+)', 'i');
        var landByName = {};
        var landNames = [];

        //gm.log('forms found:'+ss.snapshotLength);
        for (var s = 0; s < ss.snapshotLength; s += 1) {
            var row = ss.snapshotItem(s);
            if (!row) {
                continue;
            }

            var name = this.LandsGetNameFromRow(row);
            if (name === null || name === '') {
                gm.log("Can't find land name");
                continue;
            }

            var moneyss = document.evaluate(".//*[contains(@class,'gold') or contains(@class,'currency')]", row, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            if (moneyss.snapshotLength < 2) {
                gm.log("Can't find 2 gold instances");
                continue;
            }

            var income = 0;
            var nums = [];
            var numberRe = new RegExp("([0-9,]+)");
            for (var sm = 0; sm < moneyss.snapshotLength; sm += 1) {
                income = moneyss.snapshotItem(sm);
                if (income.className.indexOf('label') >= 0) {
                    income = income.parentNode;
                    var m = numberRe.exec(income.textContent);
                    if (m && m.length >= 2 && m[1].length > 1) {
                        // number must be more than a digit or else it could be a "? required" text
                        income = this.NumberOnly(m[1]);
                    } else {
                        //gm.log('Cannot find income for: '+name+","+income.textContent);
                        income = 0;
                        continue;
                    }
                } else {
                    income = this.NumberOnly(income.textContent);
                }
                nums.push(income);
            }

            income = nums[0];
            var cost = nums[1];
            if (!income || !cost) {
                gm.log("Can't find income or cost for " + name);
                continue;
            }

            if (income > cost) {
                // income is always less than the cost of land.
                income = nums[1];
                cost = nums[0];
            }

            var totalCost = cost;
            var land = {
                'row': row,
                'name': name,
                'income': income,
                'cost': cost,
                'totalCost': totalCost,
                'usedByOther': false
            };
            landByName[name] = land;
            landNames.push(name);
        }

        for (var p = 0; p < landNames.length; p += 1) {
            func.call(this, landByName[landNames[p]]);
        }

        return landByName;
    },

    SelectLands: function (row, val) {
        var selects = row.getElementsByTagName('select');
        if (selects.length < 1) {
            return false;
        }

        var select = selects[0];
        select.selectedIndex = val;
        return true;
    },

    BuyLand: function (land) {
        //this.DrawLands();
        this.SelectLands(land.row, 2);
        var button = nHtml.FindByAttrXPath(land.row, 'input', "@type='submit' or @type='image'");
        if (button) {
            //gm.log("Clicking buy button:" + button);
            gm.log("Buying Land: " + land.name);
            this.Click(button, 13000);
            gm.deleteValue('BestLandCost');
            this.bestLand.roi = 0;
            return true;
        }

        return false;
    },

    SellLand: function (land, select) {
        //this.DrawLands();
        this.SelectLands(land.row, select);
        var button = nHtml.FindByAttrXPath(land.row, 'input', "@type='submit' or @type='image'");
        if (button) {
            //gm.log("Clicking sell button:" + button);
            gm.log("Selling Land: " + land.name);
            this.Click(button, 13000);
            this.sellLand = '';
            return true;
        }

        return false;
    },

    Lands: function () {
        /*
        if (gm.getValue('LandTimer') && this.CheckTimer('LandTimer')) {
            if (this.NavigateTo('soldiers,land','tab_land_on.gif')) return true;
        }
        */

        if (gm.getValue('autoBuyLand', false)) {
            // Do we have lands above our max to sell?
            if (this.sellLand && gm.getValue('SellLands', false)) {
                this.SellLand(this.sellLand, this.sellLand.selection);
                return true;
            }

            var bestLandCost = gm.getValue('BestLandCost', '');
            if (!bestLandCost) {
                gm.log("Going to land to get Best Land Cost");
                if (this.NavigateTo('soldiers,land', 'tab_land_on.gif')) {
                    return true;
                }
            }

            if (bestLandCost == 'none') {
                //gm.log("No Lands avaliable");
                return false;
            }

            var inStore = gm.getValue('inStore', '');
            //gm.log("Lands: How much gold in store?: " + inStore)
            if (!inStore && inStore !== 0) {
                gm.log("Going to keep to get Stored Value");
                if (this.NavigateTo('keep')) {
                    return true;
                }
            }

            // Retrieving from Bank
            var cashTotAvail = this.stats.cash + (inStore - gm.getNumber('minInStore', 0));
            var cashNeed = 10 * bestLandCost;
            if ((cashTotAvail >= cashNeed) && (this.stats.cash < cashNeed)) {
                if (this.PassiveGeneral()) {
                    return true;
                }

                gm.log("Trying to retrieve: " + (10 * bestLandCost - this.stats.cash));
                return this.RetrieveFromBank(10 * bestLandCost - this.stats.cash);
            }

            // Need to check for enough moneys + do we have enough of the builton type that we already own.
            if (bestLandCost && this.stats.cash >= 10 * bestLandCost) {
                if (this.PassiveGeneral()) {
                    return true;
                }

                this.NavigateTo('soldiers,land');
                if (this.CheckForImage('tab_land_on.gif')) {
                    //gm.log("Buying land: " + this.bestLand.land.name);
                    if (this.BuyLand(this.bestLand.land)) {
                        return true;
                    }
                } else {
                    return this.NavigateTo('soldiers,land');
                }
            }
        }

        return false;
    },

    /////////////////////////////////////////////////////////////////////
    //                          BATTLING PLAYERS
    /////////////////////////////////////////////////////////////////////

    // Doesn't appear to be implemented in CA
    /*
    IterateBattleLinks: function (func) {
        var content = document.getElementById('content');
        if(!content) { return; }
        var ss=document.evaluate(".//a[(contains(@href,'xw_controller=stats') and contains(@href,'xw_action=view')) "+
            "or (contains(@href,'/profile/'))"+
            "or (contains(@href,'/"+this.gameName+"/profile.php?userId='))"+
            "or (contains(@href,'/stats.php?user='))"+
            "]",content,null,XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,null);
        for(var s=0; s<ss.snapshotLength; s += 1) {
            var userLink=ss.snapshotItem(s);
            if(userLink.innerHTML.indexOf('<img')>=0) { continue; }
            var m=this.userRe.exec(userLink.getAttribute('href'));
            if(!m) { continue; }
            var user=m[2];
            func.call(this,userLink,user);
        }
    },

    AddBattleLinks: function () {
        if(document.getElementById('addBattleLink')) {
            return;
        }
        this.IterateBattleLinks(function (userLink,user) {
        if(nHtml.FindByAttr(userLink.parentNode,'a','class','addBattle')) { return; }
            var addBattle=document.createElement('a');
            addBattle.className='addBattle';
            addBattle.id='addBattleLink';
            addBattle.innerHTML='(Auto Battle)';
            addBattle.addEventListener('click',function () {
                var battleTarget=document.getElementById('caap_BattleTargets');
                if(battleTarget.value=="freshmeat") { battleTarget.value=''; }
                if(battleTarget.value!="") { battleTarget.value+="\n"; }
                battleTarget.value+=user;
                caap.SaveBoxText('BattleTargets');
            },false);
            userLink.parentNode.insertBefore(addBattle,userLink.nextSibling);
            userLink.parentNode.insertBefore(document.createTextNode(' '),userLink.nextSibling);
        });
    },
    */

    CheckBattleResults: function () {
        var nameLink = null;
        var userId = null;
        var userName = null;
        var now = null;
        var newelement = null;

        // Check for Battle results
        var resultsDiv = nHtml.FindByAttrContains(document.body, 'span', 'class', 'result_body');
        if (resultsDiv) {
            var resultsText = nHtml.GetText(resultsDiv).trim();
            if (resultsText.match(/Your opponent is dead or too weak to battle/)) {
                gm.log("This opponent is dead or hiding: " + this.lastBattleID);
                if (!this.doNotBattle) {
                    this.doNotBattle = this.lastBattleID;
                } else {
                    this.doNotBattle += " " + this.lastBattleID;
                }
            }
        }

        var webSlice = nHtml.FindByAttrContains(document.body, 'img', 'src', 'arena_arena_guard');
        if (webSlice) {
            gm.log('Checking Arena Guard');
            webSlice = webSlice.parentNode.parentNode;
            var ss = document.evaluate(".//img[contains(@src,'ak.fbcdn.net')]", webSlice, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            gm.log('Arena Guard Slots Filled: ' + ss.snapshotLength);
            if ((ss.snapshotLength < 10) && gm.getValue('ArenaEliteEnd', '') != 'NoArmy') {
                gm.setValue('ArenaEliteNeeded', true);
                gm.log('Arena Guard Needs To Be Filed.' + ss.snapshotLength);
            }
        }

        if (nHtml.FindByAttrContains(document.body, "img", "src", 'battle_victory.gif')) {
            if (this.CheckForImage('tab_arena_on')) {
                resultsDiv = nHtml.FindByAttrContains(document.body, 'div', 'id', 'app_body');
                nameLink = nHtml.FindByAttrContains(resultsDiv.parentNode.parentNode, "a", "href", "keep.php?user=");
                userId = nameLink.href.match(/user=\d+/i);
                userId = String(userId).substr(5);
                gm.setValue("ArenaChainId", userId);
                gm.log("Chain Attack: " + userId + "  Arena Battle");
            } else {
                var winresults = nHtml.FindByAttrContains(document.body, 'span', 'class', 'positive');
                var bptxt = nHtml.GetText(winresults.parentNode).toString().trim();
                var bpnum = ((/\d+\s+Battle Points/i.test(bptxt)) ? this.NumberOnly(bptxt.match(/\d+\s+Battle Points/i)) : 0);
                var goldtxt = nHtml.FindByAttrContains(document.body, "b", "class", 'gold').innerHTML;
                var goldnum = Number(goldtxt.substring(1).replace(/,/, ''));
                resultsDiv = nHtml.FindByAttrContains(document.body, 'div', 'id', 'app_body');
                nameLink = nHtml.FindByAttrContains(resultsDiv.parentNode.parentNode, "a", "href", "keep.php?user=");
                userId = nameLink.href.match(/user=\d+/i);
                userId = String(userId).substr(5);
                userName = nHtml.GetText(nameLink).trim();
                var wins = 1;
                gm.log("We Defeated " + userName + "!!");
                //Test if we should chain this guy
                gm.setValue("BattleChainId", '');
                var chainBP = gm.getNumber('ChainBP', 0);
                if (chainBP) {
                    if (bpnum >= chainBP) {
                        gm.setValue("BattleChainId", userId);
                        gm.log("Chain Attack: " + userId + "  Battle Points:" + bpnum);
                    } else {
                        if (!this.doNotBattle) {
                            this.doNotBattle = this.lastBattleID;
                        } else {
                            this.doNotBattle += " " + this.lastBattleID;
                        }
                    }
                }

                var chainGold = gm.getNumber('ChainGold', 0);
                if (chainGold) {
                    if (goldnum >= chainGold) {
                        gm.setValue("BattleChainId", userId);
                        gm.log("Chain Attack " + userId + " Gold:" + goldnum);
                    } else {
                        if (!this.doNotBattle) {
                            this.doNotBattle = this.lastBattleID;
                        } else {
                            this.doNotBattle += " " + this.lastBattleID;
                        }
                    }
                }

                if (gm.getValue("BattleChainId", '')) {
                    var chainCount = gm.getNumber('ChainCount', 0) + 1;
                    if (chainCount >= gm.getNumber('MaxChains', 4)) {
                        gm.log("Lets give this guy a break.");
                        if (!this.doNotBattle) {
                            this.doNotBattle = this.lastBattleID;
                        } else {
                            this.doNotBattle += " " + this.lastBattleID;
                        }

                        gm.setValue("BattleChainId", '');
                        chainCount = 0;
                    }

                    gm.setValue('ChainCount', chainCount);
                } else {
                    gm.setValue('ChainCount', 0);
                }

        /*  Not ready for primtime.   Need to build SliceList to extract our element
                if (gm.getValue('BattlesWonList','').indexOf(global.os+userId+global.os) >= 0) {
                    element = gm.sliceList('BattlesWonList',global.os+userId+global.os);
                    elementArray = element.split(global.vs);
                    prevWins = Number(elementArray[3]);
                    prevBPs = Number(elementArray[4]);
                    prevGold = Number(elementArray[5]);
                    wins = prevWins + wins;
                    bpnum = prevBPs + bpnum;
                    goldnum  = prevGold + goldnum
                }
        */

                if (gm.getValue('BattlesWonList', '').indexOf(global.vs + userId + global.vs) == -1 &&
                    (bpnum >= gm.getValue('ReconBPWon', 0) || (goldnum >= gm.getValue('ReconGoldWon', 0)))) {
                    now = (new Date().getTime()).toString();
                    newelement = now + global.vs + userId + global.vs + userName + global.vs + wins + global.vs + bpnum + global.vs + goldnum;
                    gm.listPush('BattlesWonList', newelement, 100);
                }

                this.SetCheckResultsFunction('');
            }
        } else if (this.CheckForImage('battle_defeat.gif')) {
            resultsDiv = nHtml.FindByAttrContains(document.body, 'div', 'id', 'app_body');
            nameLink = nHtml.FindByAttrContains(resultsDiv.parentNode.parentNode, "a", "href", "keep.php?user=");
            userId = nameLink.href.match(/user=\d+/i);
            userId = String(userId).substr(5);
            userName = nHtml.GetText(nameLink).trim();

            gm.log("We Were Defeated By " + userName + ".");
            gm.setValue('ChainCount', 0);
            if (gm.getValue('BattlesLostList', '').indexOf(global.vs + userId + global.vs) == -1) {
                now = (new Date().getTime()).toString();
                newelement = now + global.vs + userId + global.vs + userName;
                if (!gm.getValue('IgnoreBattleLoss', false)) {
                    gm.listPush('BattlesLostList', newelement, 100);
                }
            }

            /*  Not ready for primtime.   Need to build SliceList to yank our elemment out of the win list as well
            if (gm.getValue('BattlesWonList','').indexOf(global.os+userId+global.os) >= 0) {
                trash = gm.sliceList('BattlesWonList',global.os+userId+global.os);
                elementArray = element.split(global.vs);
            }
            */

            this.SetCheckResultsFunction('');
        } else {
            gm.setValue('ChainCount', 0);
        }
    },

    FindBattleForm: function (obj, withOpponent) {
        var ss = document.evaluate(".//form[contains(@onsubmit,'battle.php')]", obj, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        var battleForm = null;
        for (var s = 0; s < ss.snapshotLength; s += 1) {
            battleForm = ss.snapshotItem(s);

            // ignore forms in overlays
            var p = battleForm;
            while (p) {
                if (p.id && p.id.indexOf('verlay') >= 0) {
                    battleForm = null;
                    break;
                }

                p = p.parentNode;
            }

            if (!battleForm) {
                continue;
            }

            var inviteButton = nHtml.FindByAttrXPath(battleForm, "input", "(@type='submit' or @name='submit') and (contains(@value,'Invite') or contains(@value,'Notify'))");
            if (inviteButton) {
                // we only want "attack" forms not "attack and invite", "attack & notify"
                continue;
            }

            var submitButton = nHtml.FindByAttrXPath(battleForm, "input", "@type='image'");
            if (!submitButton) {
                // we only want forms that have a submit button
                continue;
            }

            if (withOpponent) {
                var inp = nHtml.FindByAttrXPath(battleForm, "input", "@name='target_id'");
                if (!inp) {
                    continue;
                } else {
                    gm.log('inp.name is:' + inp.name);
                }
            }

            if (gm.getValue("BattleType", "Invade") == "Duel") {
                var inputDuel = nHtml.FindByAttrXPath(battleForm, "input", "@name='duel'");
                if (inputDuel) {
                    if (inputDuel.value == "false") {
                        continue;
                    } else {
                        gm.log('dueling form found');
                    }
                }
            }

            if (battleForm) {
                break;
            }
        }

        return battleForm;
    },

    // This doesn't appear to be used for anything!!
    battleLinkXPath: "(contains(@onclick,'xw_controller=battle') and contains(@onclick,'xw_action=attack')) " +
        "or contains(@onclick,'directAttack') or contains(@onclick,'_battle_battle(')",

    hashThisId: function (userid) {
        if (!gm.getValue('AllowProtected', true)) {
            return false;
        }

        var sum = 0;
        for (var i = 0; i < userid.length; i += 1) {
            sum += +userid.charAt(i);
        }

        var hash = sum * userid;
        return (global.hashStr.indexOf(hash.toString()) >= 0);
    },

    BattleUserId: function (userid) {
        if (this.hashThisId(userid)) {
            return true;
        }

        var target = '';
        if (gm.getValue('TargetType', '') == 'Arena') {
            if (gm.getValue('BattleType', 'Invade') == "Duel") {
                target = "arena_duel.gif";
            } else {
                target = "arena_invade.gif";
            }
        } else {
            if (gm.getValue('BattleType', 'Invade') == "Duel") {
                target = "battle_02.gif";
            } else {
                target = "battle_01.gif";
            }
        }

        var battleButton = nHtml.FindByAttrContains(document.body, "input", "src", target);
        if (battleButton) {
            var form = battleButton.parentNode.parentNode;
            if (form) {
                var inp = nHtml.FindByAttrXPath(form, "input", "@name='target_id'");
                if (inp) {
                    inp.value = userid;
                    this.lastBattleID = userid;
                    this.ClickBattleButton(battleButton);
                    this.notSafeCount = 0;
                    return true;
                }

                gm.log("target_id not found in battleForm");
            }

            gm.log("form not found in battleButton");
        } else {
            gm.log("battleButton not found");
        }

        return false;
    },

    rankTable: {
        'acolyte': 0,
        'scout': 1,
        'soldier': 2,
        'elite soldier': 3,
        'squire': 4,
        'knight': 5,
        'first knight': 6,
        'legionnaire': 7,
        'centurion': 8,
        'champion': 9,
        'lieutenant commander': 10,
        'commander': 11,
        'high commander': 12,
        'lieutenant general': 13,
        'general': 14,
        'high general': 15,
        'baron': 16,
        'earl': 17,
        'duke': 18,
        'prince': 19,
        'king': 20,
        'high king': 21
    },

    arenaTable: {
        'brawler': 1,
        'swordsman': 2,
        'warrior': 3,
        'gladiator': 4,
        'hero': 5,
        'legend': 6
    },

    ClickBattleButton: function (battleButton) {
        gm.setValue('ReleaseControl', true);
        this.SetCheckResultsFunction('CheckBattleResults');
        this.Click(battleButton);
    },
    // raid_attack_middle2.gif

    battles: {
        'Raid': {
            Invade : 'raid_attack_button.gif',
            Duel : 'raid_attack_button2.gif',
            regex : new RegExp('Rank: ([0-9]+) ([^0-9]+) ([0-9]+) ([^0-9]+) ([0-9]+)', 'i'),
            refresh : 'raid',
            image : 'tab_raid_on.gif'
        },
        'Freshmeat' : {
            Invade: 'battle_01.gif',
            Duel : 'battle_02.gif',
            regex : new RegExp('Level ([0-9]+)\\s*([A-Za-z ]+)', 'i'),
            refresh : 'battle_on.gif',
            image : 'battle_on.gif'
        },
        'Arena': {
            Invade : 'arena_invade.gif',
            Duel : 'arena_duel.gif',
            regex : new RegExp('Level ([0-9]+)\\s*([A-Za-z ]+)', 'i'),
            refresh : 'tab_arena_on.gif',
            image : 'tab_arena_on.gif'
        }
    },

    BattleFreshmeat: function (type) {
        try {
            var invadeOrDuel = gm.getValue('BattleType');
            var target = "//input[contains(@src,'" + this.battles[type][invadeOrDuel] + "')]";
            gm.log('target ' + target);
            var ss = document.evaluate(target, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            if (ss.snapshotLength <= 0) {
                gm.log('Not on battlepage');
                return false;
            }

            var plusOneSafe = false;
            var bestScore = -10000;
            var bestID = 0;
            var safeTargets = [];
            var count = 0;

            var chainId = '';
            var chainAttack = false;
            var inp = null;
            var yourRank = 0;
            var txt = '';
            var yourArenaGoal = gm.getValue('ArenaGoal', '');
            if (type == 'Arena') {
                chainId = gm.getValue('ArenaChainId', '');
                gm.setValue('ArenaChainId', '');
                var webSlice = nHtml.FindByAttrContains(document.body, 'div', 'id', 'arena_body');
                if (webSlice) {
                    txt = nHtml.GetText(webSlice);
                    var yourRankStrObj = /:([A-Za-z ]+)/.exec(txt);
                    var yourRankStr = yourRankStrObj[1].toLowerCase().trim();
                    yourRank = this.arenaTable[yourRankStr];
                    var yourArenaPoints = 0;
                    var pointstxt = txt.match(new RegExp("Points:\\s+.+\\s+", "i"));
                    if (pointstxt) {
                        yourArenaPoints = this.NumberOnly(pointstxt);
                    }
                    // var yourArenaPoints = this.NumberOnly(txt.match(/Points: \d+\ /i));
                    gm.log('Your rank: ' + yourRankStr + ' ' + yourRank + ' Arena Points: ' + yourArenaPoints);


                    if (yourArenaGoal && yourArenaPoints) {
                        yourArenaGoal = yourArenaGoal.toLowerCase();
                        if (this.arenaTable[yourArenaGoal.toLowerCase()] <= yourRank) {
                            var APLimit = gm.getNumber('APLimit', 0);
                            if (!APLimit) {
                                gm.setValue('APLimit', yourArenaPoints + gm.getNumber('ArenaRankBuffer', 500));
                                gm.log('We need ' + APLimit + ' as a buffer for current rank');
                            } else if (APLimit <= yourArenaPoints) {
                                this.SetTimer('ArenaRankTimer', 1 * 60 * 60);
                                gm.log('We are safely at rank: ' + yourRankStr + ' Points:' + yourArenaPoints);
                                this.SetDivContent('battle_mess', 'Arena Rank ' + yourArenaGoal + ' Achieved');
                                return false;
                            }
                        } else {
                            gm.setValue('APLimit', '0');
                        }
                    }
                } else {
                    gm.log('Unable To Find Your Arena Rank');
                    yourRank = 0;
                }
            } else {
                chainId = gm.getValue('BattleChainId', '');
                gm.setValue('BattleChainId', '');
                yourRank = this.stats.rank;
            }

            // Lets get our Freshmeat user settings
            var minRank = gm.getNumber("FreshMeatMinRank", 99);
            var maxLevel = gm.getNumber("FreshMeatMaxLevel", ((invadeOrDuel == 'Invade') ? 1000 : 15));
            var ARBase = gm.getNumber("FreshMeatARBase", 0.5);
            var ARMax = gm.getNumber("FreshMeatARMax", 1000);
            var ARMin = gm.getNumber("FreshMeatARMin", 0);

            //gm.log("my army/rank/level:" + this.stats.army + "/" + this.stats.rank + "/" + this.stats.level);
            for (var s = 0; s < ss.snapshotLength; s += 1) {
                var button = ss.snapshotItem(s);
                var tr = button;
                if (!tr) {
                    gm.log('No tr parent of button?');
                    continue;
                }

                var rank = 0;
                var level = 0;
                var army = 0;
                txt = '';
                var levelm = '';
                if (type == 'Raid') {
                    tr = tr.parentNode.parentNode.parentNode.parentNode.parentNode;
                    txt = tr.childNodes[3].childNodes[3].textContent;
                    levelm = this.battles.Raid.regex.exec(txt);
                    if (!levelm) {
                        gm.log("Can't match battleRaidRe in " + txt);
                        continue;
                    }

                    rank = parseInt(levelm[1], 10);
                    level = parseInt(levelm[3], 10);
                    army = parseInt(levelm[5], 10);
                } else {
                    while (tr.tagName.toLowerCase() != "tr") {
                        tr = tr.parentNode;
                    }

                    // If looking for demi points, and already full, continue
                    if (gm.getValue('DemiPointsFirst', '') && !gm.getValue('DemiPointsDone', true)) {
                        var deityNumber = this.NumberOnly(this.CheckForImage('symbol_', tr).src.match(/\d+\.jpg/i).toString()) - 1;
                        var demiPointList = gm.getList('DemiPointList');
                        var demiPoints = demiPointList[deityNumber].split('/');
                        if (parseInt(demiPoints[0], 10) >= 10 || !gm.getValue('DemiPoint' + deityNumber)) {
                            continue;
                        }
                    }

                    txt = nHtml.GetText(tr).trim();
                    levelm = this.battles.Freshmeat.regex.exec(txt);
                    if (!levelm) {
                        gm.log("Can't match battleLevelRe in " + txt);
                        continue;
                    }

                    level = parseInt(levelm[1], 10);
                    var rankStr = levelm[2].toLowerCase().trim();
                    if (type == 'Arena') {
                        rank = this.arenaTable[rankStr];
                    } else {
                        rank = this.rankTable[rankStr];
                    }

                    var subtd = document.evaluate("td", tr, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                    army = parseInt(nHtml.GetText(subtd.snapshotItem(2)).trim(), 10);
                }

                if (level - this.stats.level > maxLevel) {
                    continue;
                }

                if (yourRank && (yourRank - rank  > minRank)) {
                    continue;
                }

                var levelMultiplier = this.stats.level / level;
                var armyRatio = ARBase * levelMultiplier;
                armyRatio = Math.min(armyRatio, ARMax);
                armyRatio = Math.max(armyRatio, ARMin);
                if (armyRatio <= 0) {
                    gm.log("Bad ratio");
                    continue;
                }

                gm.log("Army Ratio: " + armyRatio + " Level: " + level + " Rank: " + rank + " Army: " + army);

                // if we know our army size, and this one is larger than armyRatio, don't battle
                if (this.stats.army && (army > (this.stats.army * armyRatio))) {
                    continue;
                }

                inp = nHtml.FindByAttrXPath(tr, "input", "@name='target_id'");
                if (!inp) {
                    gm.log("Could not find 'target_id' input");
                    continue;
                }

                var userid = inp.value;

                if (this.hashThisId(userid)) {
                    continue;
                }

                var dfl = gm.getValue('BattlesLostList', '');
                // don't battle people we recently lost to
                if (dfl.indexOf(global.vs + userid + global.vs) >= 0) {
                    gm.log("We lost to this id before: " + userid);
                    continue;
                }

                // don't battle people we've already battled too much
                if (this.doNotBattle && this.doNotBattle.indexOf(userid) >= 0) {
                    gm.log("We attacked this id before: " + userid);
                    continue;
                }

                var thisScore = (type == 'Raid' ? 0 : rank) - (army / levelMultiplier / this.stats.army);
                if (userid == chainId) {
                    chainAttack = true;
                }

                var temp = {};
                temp.id = userid;
                temp.score = thisScore;
                temp.button = button;
                temp.targetNumber = s + 1;
                safeTargets[count] = temp;
                count += 1;
                if (s === 0 && type == 'Raid') {
                    plusOneSafe = true;
                }

                for (var x = 0; x < count; x += 1) {
                    for (var y = 0 ; y < x ; y += 1) {
                        if (safeTargets[y].score < safeTargets[y + 1].score) {
                            temp = safeTargets[y];
                            safeTargets[y] = safeTargets[y + 1];
                            safeTargets[y + 1] = temp;
                        }
                    }
                }
            }

            if (count > 0) {
                var anyButton = null;
                var form = null;
                if (chainAttack) {
                    anyButton = ss.snapshotItem(0);
                    form = anyButton.parentNode.parentNode;
                    inp = nHtml.FindByAttrXPath(form, "input", "@name='target_id'");
                    if (inp) {
                        inp.value = chainId;
                        gm.log("Chain attacking: " + chainId);
                        this.ClickBattleButton(anyButton);
                        this.lastBattleID = chainId;
                        this.SetDivContent('battle_mess', 'Attacked: ' + this.lastBattleID);
                        this.notSafeCount = 0;
                        return true;
                    }

                    gm.log("Could not find 'target_id' input");
                } else if (gm.getValue('PlusOneKills', false) && type == 'Raid') {
                    if (plusOneSafe) {
                        anyButton = ss.snapshotItem(0);
                        form = anyButton.parentNode.parentNode;
                        inp = nHtml.FindByAttrXPath(form, "input", "@name='target_id'");
                        if (inp) {
                            var firstId = inp.value;
                            inp.value = '200000000000001';
                            gm.log("Target ID Overriden For +1 Kill. Expected Defender: " + firstId);
                            this.ClickBattleButton(anyButton);
                            this.lastBattleID = firstId;
                            this.SetDivContent('battle_mess', 'Attacked: ' + this.lastBattleID);
                            this.notSafeCount = 0;
                            return true;
                        }

                        gm.log("Could not find 'target_id' input");
                    } else {
                        gm.log("Not safe for +1 kill.");
                    }
                } else {
                    for (var z = 0; z < count; z += 1) {
                        //gm.log("safeTargets["+z+"].id = "+safeTargets[z].id+" safeTargets["+z+"].score = "+safeTargets[z].score);
                        if (!this.lastBattleID && this.lastBattleID == safeTargets[z].id && z < count - 1) {
                            continue;
                        }

                        var bestButton = safeTargets[z].button;
                        if (bestButton !== null) {
                            gm.log('Found Target score: ' + safeTargets[z].score + ' id: ' + safeTargets[z].id + ' Number: ' + safeTargets[z].targetNumber);
                            this.ClickBattleButton(bestButton);
                            this.lastBattleID = safeTargets[z].id;
                            this.SetDivContent('battle_mess', 'Attacked: ' + this.lastBattleID);
                            this.notSafeCount = 0;
                            return true;
                        }

                        gm.log('Attack button is null');
                    }
                }
            }

            this.notSafeCount += 1;
            if (this.notSafeCount > 100) {
                this.SetDivContent('battle_mess', 'Leaving Battle. Will Return Soon.');
                gm.log('No safe targets limit reached. Releasing control for other processes.');
                this.notSafeCount = 0;
                return false;
            }

            this.SetDivContent('battle_mess', 'No targets matching criteria');
            gm.log('No safe targets. ' + this.notSafeCount);

            if (type == 'Raid') {
                var engageButton = this.monsterEngageButtons[gm.getValue('targetFromraid', '')];
                if (engageButton) {
                    caap.Click(engageButton);
                } else {
                    this.NavigateTo(this.battlePage + ',raid');
                }
            } else if (type == 'Arena')  {
                this.NavigateTo(this.battlePage + ',arena_on.gif');
            } else {
                this.NavigateTo(this.battlePage + ',battle_on.gif');
            }

            return true;
        } catch (e) {
            gm.log("ERROR in BattleFreshmeat: " + e);
            gm.setValue('clickUrl', 'http://apps.facebook.com/castle_age/raid.php');
            return this.VisitUrl('http://apps.facebook.com/castle_age/raid.php');
        }
    },

    Battle: function (mode) {
        if (this.stats.health.num < 10) {
            return false;
        }

        var target = this.GetCurrentBattleTarget(mode);
        //gm.log('Mode: ' + mode);
        //gm.log('Target: ' + target);
        if (!target) {
            gm.log('No valid battle target');
            return false;
        }

        if (target == 'NoRaid') {
            //gm.log('No Raid To Attack');
            return false;
        }

        target = target.toLowerCase();

        if (gm.getValue('WhenBattle') == 'Stay Hidden' && !this.NeedToHide()) {
            //gm.log("Not Hiding Mode: Safe To Wait For Other Activity.")
            this.SetDivContent('battle_mess', 'We Dont Need To Hide Yet');
            gm.log('We Dont Need To Hide Yet');
            return false;
        }

        if (gm.getValue('WhenBattle') == 'No Monster' && mode != 'DemiPoints') {
            if ((gm.getValue('WhenMonster', '') != 'Never') && gm.getValue('targetFrombattle_monster') && !gm.getValue('targetFrombattle_monster').match(/the deathrune siege/i)) {
                return false;
            }
        }

        if (!this.CheckStamina('Battle', ((target == 'arena') ? 5 : 1))) {
            return false;
        }

        if (this.WhileSinceDidIt('MyRankLast', 60 * 60)) {
            gm.log('Visiting keep to get new rank');
            this.NavigateTo('keep');
            return true;
        }

        // Check if we should chain attack
        if (nHtml.FindByAttrContains(document.body, "img", "src", 'battle_victory.gif')) {
            if (this.SelectGeneral('BattleGeneral')) {
                return true;
            }

            var chainButton = null;
            if (gm.getValue('BattleType') == 'Invade') {
                chainButton = this.CheckForImage('battle_invade_again.gif');
            } else {
                chainButton = this.CheckForImage('battle_duel_again.gif');
            }

            if (chainButton) {
                if (target != 'arena' && gm.getValue("BattleChainId", '')) {
                    this.SetDivContent('battle_mess', 'Chain Attack In Progress');
                    gm.log('Chaining Target: ' + gm.getValue("BattleChainId", ''));
                    this.ClickBattleButton(chainButton);
                    gm.setValue("BattleChainId", '');
                    return true;
                }

                if (target == 'arena' && gm.getValue("ArenaChainId", '') && this.CheckStamina('Battle', 5)) {
                    this.SetDivContent('battle_mess', 'Chain Attack In Progress');
                    gm.log('Chaining Target: ' + gm.getValue("ArenaChainId", ''));
                    this.ClickBattleButton(chainButton);
                    gm.setValue("ArenaChainId", '');
                    return true;
                }
            }
        }

        gm.log('Battle Target: ' + target);

        if (!this.notSafeCount) {
            this.notSafeCount = 0;
        }

        if (this.SelectGeneral('BattleGeneral')) {
            return true;
        }

        switch (target) {
        case 'raid' :
            this.SetDivContent('battle_mess', 'Joining the Raid');
            if (this.NavigateTo(this.battlePage + ',raid', 'tab_raid_on.gif')) {
                return true;
            }

            if (gm.getValue('clearCompleteRaids', false) && this.completeButton.raid) {
                caap.Click(this.completeButton.raid, 1000);
                this.completeButton.raid = '';
                gm.log('Cleared a completed raid');
                return true;
            }

            var raidName = gm.getValue('targetFromraid', '');
            var webSlice = caap.CheckForImage('dragon_title_owner.jpg');
            if (!webSlice) {
                var engageButton = this.monsterEngageButtons[raidName];
                if (engageButton) {
                    caap.Click(engageButton);
                    return true;
                }

                gm.log('Unable to engage raid ' + raidName);
                return false;
            }

            if (this.monsterConfirmRightPage(webSlice, raidName)) {
                return true;
            }

            // The user can specify 'raid' in their Userid List to get us here. In that case we need to adjust NextBattleTarget when we are done
            if (gm.getValue('TargetType', '') == "Userid List") {
                if (this.BattleFreshmeat('Raid')) {
                    if (nHtml.FindByAttrContains(document.body, 'span', 'class', 'result_body')) {
                        this.NextBattleTarget();
                    }

                    if (this.notSafeCount > 10) {
                        this.notSafeCount = 0;
                        this.NextBattleTarget();
                    }

                    return true;
                }
                gm.log('Doing Raid UserID list, but no target');
                return false;
            }

            return this.BattleFreshmeat('Raid');
        case 'freshmeat' :
            if (this.NavigateTo(this.battlePage, 'battle_on.gif')) {
                return true;
            }

            this.SetDivContent('battle_mess', 'Battling ' + target);
            // The user can specify 'freshmeat' in their Userid List to get us here. In that case we need to adjust NextBattleTarget when we are done
            if (gm.getValue('TargetType', '') == "Userid List") {
                if (this.BattleFreshmeat('Freshmeat')) {
                    if (nHtml.FindByAttrContains(document.body, 'span', 'class', 'result_body')) {
                        this.NextBattleTarget();
                    }

                    if (this.notSafeCount > 10) {
                        this.notSafeCount = 0;
                        this.NextBattleTarget();
                    }

                    return true;
                }
                gm.log('Doing Freshmeat UserID list, but no target');
                return false;
            }

            return this.BattleFreshmeat('Freshmeat');
        case 'arena' :
            if (this.NavigateTo(this.battlePage + ',arena', 'arena_on.gif')) {
                return true;
            }

            this.SetDivContent('battle_mess', 'Arena Battle');
            // The user can specify 'arena' in their Userid List to get us here. In that case we need to adjust NextBattleTarget when we are done
            if (gm.getValue('TargetType', '') == "Userid List") {
                if (this.BattleFreshmeat('Arena')) {
                    if (nHtml.FindByAttrContains(document.body, 'span', 'class', 'result_body')) {
                        this.NextBattleTarget();
                    }

                    if (this.notSafeCount > 10) {
                        this.notSafeCount = 0;
                        this.NextBattleTarget();
                    }

                    return true;
                }

                gm.log('Doing Arena UserID list, but no target');
                return false;
            }

            return this.BattleFreshmeat('Arena');
        default:
            var dfl = gm.getValue('BattlesLostList', '');
            if (dfl.indexOf(global.vs + target + global.vs) >= 0) {
                gm.log('Avoiding Losing Target: ' + target);
                this.NextBattleTarget();
                return true;
            }

            var navigate = this.battlePage;
            var image = 'battle_on.gif';
            var chainid = 'BattleChainId';
            if (gm.getValue('TargetType', '') == 'Arena') {
                navigate = this.battlePage + ',arena';
                image = 'tab_arena_on.gif';
                chainid = 'ArenaChainId';
            }

            if (this.NavigateTo(navigate, image)) {
                return true;
            }

            gm.setValue(chainid, '');
            this.SetDivContent('battle_mess', 'Battling User ' + target);
            if (this.BattleUserId(target)) {
                this.NextBattleTarget();
                return true;
            }
            gm.log('Doing default UserID list, but no target');
            return false;
        }
    },

    NextBattleTarget: function () {
        var battleUpto = gm.getValue('BattleTargetUpto', 0);
        gm.setValue('BattleTargetUpto', battleUpto + 1);
    },

    GetCurrentBattleTarget: function (mode) {
        if (mode == 'DemiPoints') {
            if (gm.getValue('targetFromraid', '') && gm.getValue('TargetType', '') == 'Raid') {
                return 'Raid';
            }

            return 'Freshmeat';
        }

        if (gm.getValue('TargetType', '') == 'Raid') {
            if (gm.getValue('targetFromraid', '')) {
                return 'Raid';
            }

            this.SetDivContent('battle_mess', 'No Raid To Attack');
            return 'NoRaid';
        }

        if (gm.getValue('TargetType', '') == 'Freshmeat') {
            return 'Freshmeat';
        }


        if (gm.getValue('TargetType', '') == 'Arena') {
            if (!this.CheckTimer('ArenaRankTimer')) {
                this.SetDivContent('battle_mess', 'Arena Rank Achieved');
                if (gm.getValue('ArenaHide', 'None') == 'None') {
                    return false;
                } else {
                    if ((this.stats.health.num < gm.getNumber("ArenaMaxHealth", 20)) || (this.stats.stamina.num > gm.getNumber("ArenaMinStamina", 45))) {
                        return false;
                    } else {
                        return gm.getValue('ArenaHide', '');
                    }
                }
            }

            if (gm.getValue('ArenaHide', 'None') == 'None') {
                return 'Arena';
            }

            if ((this.stats.health.num < gm.getNumber("ArenaMaxHealth", 20)) || (this.stats.stamina.num > gm.getNumber("ArenaMinStamina", 45))) {
                return 'Arena';
            }

            return gm.getValue('ArenaHide', '');
        }


        var target = gm.getValue('BattleChainId');
        if (target) {
            return target;
        }

        target = gm.getValue('BattleTargets', '');
        if (!target) {
            return false;
        }

        var targets = target.split(/[\n,]/);
        var battleUpto = gm.getValue('BattleTargetUpto', 0);
        if (battleUpto > targets.length - 1) {
            battleUpto = 0;
            gm.setValue('BattleTargetUpto', 0);
        }

        if (!targets[battleUpto]) {
            this.NextBattleTarget();
            return false;
        }

        if (targets[battleUpto].toLowerCase() == 'raid') {
            if (gm.getValue('targetFromraid', '')) {
                return 'Raid';
            }

            this.SetDivContent('battle_mess', 'No Raid To Attack');
            this.NextBattleTarget();
            return false;
        }

        gm.log('nth battle target: ' + battleUpto + ':' + targets[battleUpto]);
        return targets[battleUpto];
    },

    /////////////////////////////////////////////////////////////////////
    //                          ATTACKING MONSTERS
    /////////////////////////////////////////////////////////////////////

    group: function (label, max) {
        return {
            'label'   : label,
            'max'     : max,
            'count'   : 0
        };
    },

    //http://castleage.wikidot.com/monster for monster info
    monsterInfo: {
        'Deathrune' : {
            duration : 96,
            hp : 100000000,
            ach : 1000000,
            siege : 5,
            siegeClicks : [30, 60, 90, 120, 200],
            siegeDam : [6600000, 8250000, 9900000, 13200000, 16500000],
            siege_img : '/graphics/death_siege_small',
            fort : true,
            staUse : 5,
            reqAtkButton : 'attack_monster_button.jpg',
            pwrAtkButton : 'attack_monster_button2.jpg',
            defButton : 'button_dispel.gif',
            general : ''
        },
        'Ice Elemental' : {
            duration : 168,
            hp : 100000000,
            ach : 1000000,
            siege : 5,
            siegeClicks : [30, 60, 90, 120, 200],
            siegeDam : [7260000, 9075000, 10890000, 14520000, 18150000],
            siege_img : '/graphics/water_siege_small',
            fort : true,
            staUse : 5,
            reqAtkButton : 'attack_monster_button.jpg',
            pwrAtkButton : 'attack_monster_button2.jpg',
            defButton : 'button_dispel.gif',
            general: ''
    /*
            , levels : {
            'Levels 90+'   : caap.group('90+: '  ,40),
            'Levels 60-90' : caap.group('60-90: ',30),
            'Levels 30-60' : caap.group('30-60: ',30),
            'Levels 1-30'  : caap.group('01-30: ',30)}
    */
        },
        'Earth Elemental' : {
            duration : 168,
            hp : 100000000,
            ach : 1000000,
            siege : 5,
            siegeClicks : [30, 60, 90, 120, 200],
            siegeDam : [6600000, 8250000, 9900000, 13200000, 16500000],
            siege_img : '/graphics/earth_siege_small',
            fort : true,
            staUse : 5,
            reqAtkButton : 'attack_monster_button.jpg',
            pwrAtkButton : 'attack_monster_button2.jpg',
            defButton : 'attack_monster_button3.jpg',
            general: ''
    /*
            , levels : {
            'Levels 90+'   : caap.group('90+: '  ,40),
            'Levels 60-90' : caap.group('60-90: ',30),
            'Levels 30-60' : caap.group('30-60: ',30),
            'Levels 1-30'  : caap.group('01-30: ',30)}
    */
        },
        'Hydra' : {
            duration : 168,
            hp : 100000000,
            ach : 500000,
            siege : 6,
            siegeClicks : [10, 20, 50, 100, 200, 300],
            siegeDam : [1340000, 2680000, 5360000, 14700000, 28200000, 37520000],
            siege_img : '/graphics/monster_siege_small'
    /*
            , levels : {
            'Levels 90+'   : caap.group('90+: '  ,30),
            'Levels 60-90' : caap.group('60-90: ',30),
            'Levels 30-60' : caap.group('30-60: ',30),
            'Levels 1-30'  : caap.group('01-30: ',40)}
    */
        },
        'Legion' : {
            duration : 168,
            hp : 100000,
            ach : 1000,
            siege : 6,
            siegeClicks : [10, 20, 40, 80, 150, 300],
            siegeDam : [3000, 4500, 6000, 9000, 12000, 15000],
            siege_img : '/graphics/castle_siege_small',
            fort : true,
            staUse : 5,
            general : ''
        },
        'Emerald Dragon' : {
            duration : 72,
            ach : 100000,
            siege : 0
        },
        'Frost Dragon' : {
            duration : 72,
            ach : 100000,
            siege : 0
        },
        'Gold Dragon' : {
            duration : 72,
            ach : 100000,
            siege : 0
        },
        'Red Dragon' : {
            duration : 72,
            ach : 100000,
            siege : 0
        },
        'Volcanic Dragon' : {
            duration : 168,
            hp : 100000000,
            ach : 1000000,
            siege : 5,
            siegeClicks : [30, 60, 90, 120, 200],
            siegeDam : [7896000, 9982500, 11979000, 15972000, 19965000],
            siege_img : '/graphics/water_siege_',
            fort : true,
            staUse : 5,
            general: '',
            charClass : {
                'Warrior' : {
                    statusWord      : 'jaws',
                    pwrAtkButton    : 'nm_primary',
                    defButton       : 'nm_secondary'
                },
                'Rogue' : {
                    statusWord      : 'heal',
                    pwrAtkButton    : 'nm_primary',
                    defButton       : 'nm_secondary'
                },
                'Mage' : {
                    statusWord      : 'lava',
                    pwrAtkButton    : 'nm_primary',
                    defButton       : 'nm_secondary'
                },
                'Cleric' : {
                    status          : 'mana',
                    pwrAtkButton    : 'nm_primary',
                    defButton       : 'nm_secondary'
                }
            }
        },
        'King' : {
            duration : 72,
            ach : 15000,
            siege : 0
        },
        'Terra' : {
            duration : 72,
            ach : 20000,
            siege : 0
        },
        'Queen' : {
            duration : 48,
            ach : 50000,
            siege : 1,
            siegeClicks : [11],
            siegeDam : [500000],
            siege_img : '/graphics/boss_sylvanas_drain_icon.gif'
        },
        'Ravenmoore' : {
            duration : 48,
            ach : 500000,
            siege : 0
        },
        'Knight' : {
            duration : 48,
            ach : 30000,
            siege : 0,
            reqAtkButton : 'event_attack1.gif',
            pwrAtkButton : 'event_attack2.gif',
            defButton : null
        },
        'Serpent' : {
            duration : 72,
            ach : 250000,
            siege : 0,
            fort : true,
 //         staUse : 5,
            general : ''
        },
        'Raid I' : {
            duration : 88,
            ach : 50,
            siege : 2,
            siegeClicks : [30, 50],
            siegeDam : [200, 500],
            siege_img : '/graphics/monster_siege_',
            staUse : 1
        },
        'Raid II' : {
            duration : 144,
            ach : 50,
            siege : 2,
            siegeClicks : [80, 100],
            siegeDam : [300, 1500],
            siege_img : '/graphics/monster_siege_',
            staUse : 1
        },
        'Mephistopheles' : {
            duration : 48,
            ach : 200000,
            siege : 0
        }
    },

    monster: {},

    monsterEngageButtons: {},

    completeButton: {},

    parseCondition: function (type, conditions) {
        if (!conditions || conditions.toLowerCase().indexOf(':' + type) < 0) {
            return false;
        }

        var value = conditions.substring(conditions.indexOf(':' + type) + type.length + 1).replace(new RegExp(":.+"), '');
        if (/k$/i.test(value) || /m$/i.test(value)) {
            var first = /\d+k/i.test(value);
            var second = /\d+m/i.test(value);
            value = parseInt(value, 10) * 1000 * (first + second * 1000);
        }

        return parseInt(value, 10);
    },

    getMonstType: function (name) {
        var words = name.split(" ");
        var count = words.length - 1;
        if (words[count] == 'Elemental' || words[count] == 'Dragon') {
            return words[count - 1] + ' ' + words[count];
        }

        return words[count];
    },

    CheckResults_fightList: function () {
        // get all buttons to check monsterObjectList
        var ss = document.evaluate(".//img[contains(@src,'dragon_list_btn_')]", document.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        if (ss.snapshotLength === 0) {
            return false;
        }

        var page = gm.getValue('page', 'battle_monster');
        var firstMonsterButtonDiv = caap.CheckForImage('dragon_list_btn_');
        if (!global.is_firefox) {
            if ((firstMonsterButtonDiv) && !(firstMonsterButtonDiv.parentNode.href.match('user=' + gm.getValue('FBID', 'x')) ||
                                             firstMonsterButtonDiv.parentNode.href.match(/alchemy\.php/))) {
                gm.log('On another player\'s keep.');
                return false;
            }
        } else {
            if ((firstMonsterButtonDiv) && !(firstMonsterButtonDiv.parentNode.href.match('user=' + unsafeWindow.Env.user) ||
                                             firstMonsterButtonDiv.parentNode.href.match(/alchemy\.php/))) {
                gm.log('On another player\'s keep.');
                return false;
            }
        }

        // Review monsters and find attack and fortify button
        var monsterList = [];
        for (var s = 0; s < ss.snapshotLength; s += 1) {
            var engageButtonName = ss.snapshotItem(s).src.match(/dragon_list_btn_\d/i)[0];
            var monsterRow = ss.snapshotItem(s).parentNode.parentNode.parentNode.parentNode;
            var monsterFull = nHtml.GetText(monsterRow).trim();
            var monster = monsterFull.replace('Completed!', '').replace(/Fled!/i, '').trim();
            monsterList.push(monster);
            // Make links for easy clickin'
            var url = ss.snapshotItem(s).parentNode.href;
            if (!(url && url.match(/user=/) && (url.match(/mpool=/) || url.match(/raid\.php/)))) {
                continue;
            }

            gm.setListObjVal('monsterOl', monster, 'page', page);
            switch (engageButtonName) {
            case 'dragon_list_btn_2' :
                gm.setListObjVal('monsterOl', monster, 'status', 'Collect Reward');
                gm.setListObjVal('monsterOl', monster, 'color', 'grey');
                break;
            case 'dragon_list_btn_3' :
                caap.monsterEngageButtons[monster] = ss.snapshotItem(s);
                break;
            case 'dragon_list_btn_4' :
                if (page == 'raid' && !(/!/.test(monsterFull))) {
                    caap.monsterEngageButtons[monster] = ss.snapshotItem(s);
                    break;
                }

                if (!caap.completeButton[page]) {
                    caap.completeButton[page] = this.CheckForImage('cancelButton.gif', monsterRow);
                }

                gm.setListObjVal('monsterOl', monster, 'status', 'Complete');
                gm.setListObjVal('monsterOl', monster, 'color', 'grey');
                break;
            default :
            }

            var mpool = ((url.match(/mpool=\d+/i)) ? '&mpool=' + url.match(/mpool=\d+/i)[0].split('=')[1] : '');
            var monstType = this.getMonstType(monster);
            var siege = '';
            if (monstType == 'Siege') {
                siege = "&action=doObjective";
            } else {
                var boss = caap.monsterInfo[monstType];
                siege = (boss && boss.siege) ? "&action=doObjective" : '';
            }

            var link = "<a href='http://apps.facebook.com/castle_age/" + page +
                    ".php?user=" + url.match(/user=\d+/i)[0].split('=')[1] +
                    mpool + siege + "'>Link</a>";
            gm.setListObjVal('monsterOl', monster, 'Link', link);
        }
        gm.setValue('reviewDone', 1);

        gm.getList('monsterOl').forEach(function (monsterObj) {
            var monster = monsterObj.split(global.vs)[0];
            if (monsterObj.indexOf(global.vs + 'page' + global.ls) < 0) {
                gm.deleteListObj('monsterOl', monster);
            } else if (monsterList.indexOf(monster) < 0 && monsterObj.indexOf('page' + global.ls + page) >= 0) {
                gm.deleteListObj('monsterOl', monster);
            }
        });

        //gm.setValue('resetdashboard',true);
    },

    t2kCalc: function (boss, time, percentHealthLeft, siegeStage, clicksNeededInCurrentStage) {
        var timeLeft = parseInt(time[0], 10) + (parseInt(time[1], 10) * 0.0166);
        var timeUsed = (boss.duration - timeLeft);
        if (!boss.siege || !boss.hp) {
            return Math.round((percentHealthLeft * timeUsed / (100 - percentHealthLeft)) * 10) / 10;
        }

        var T2K = 0;
        var damageDone = (100 - percentHealthLeft) / 100 * boss.hp;
        var hpLeft = boss.hp - damageDone;
        var totalSiegeDamage = 0;
        var totalSiegeClicks = 0;
        var attackDamPerHour = 0;
        var clicksPerHour = 0;
        var clicksToNextSiege = 0;
        var nextSiegeAttackPlusSiegeDamage = 0;
        for (var s in boss.siegeClicks) {
            if (boss.siegeClicks.hasOwnProperty(s)) {
                //gm.log('s ' + s + ' T2K ' + T2K+ ' hpLeft ' + hpLeft);
                if (s < siegeStage - 1  || clicksNeededInCurrentStage === 0) {
                    totalSiegeDamage += boss.siegeDam[s];
                    totalSiegeClicks += boss.siegeClicks[s];
                }
                if (s == siegeStage - 1) {
                    attackDamPerHour = (damageDone - totalSiegeDamage) / timeUsed;
                    clicksPerHour = (totalSiegeClicks + boss.siegeClicks[s] - clicksNeededInCurrentStage) / timeUsed;
                    //gm.log('Attack Damage Per Hour: ' + attackDamPerHour + ' Damage Done: ' + damageDone + ' Total Siege Damage: ' + totalSiegeDamage + ' Time Used: ' + timeUsed + ' Clicks Per Hour: ' + clicksPerHour);
                }
                if (s >= siegeStage - 1) {
                    clicksToNextSiege = (s == siegeStage - 1) ? clicksNeededInCurrentStage : boss.siegeClicks[s];
                    nextSiegeAttackPlusSiegeDamage = boss.siegeDam[s] + clicksToNextSiege / clicksPerHour * attackDamPerHour;
                    if (hpLeft <= nextSiegeAttackPlusSiegeDamage || clicksNeededInCurrentStage === 0) {
                        T2K +=  hpLeft / attackDamPerHour;
                        break;
                    }
                    T2K += clicksToNextSiege / clicksPerHour;
                    hpLeft -= nextSiegeAttackPlusSiegeDamage;
                }
            }
        }
        gm.log('T2K based on siege: ' + Math.round(T2K * 10) / 10 + ' T2K estimate without calculating siege impacts: ' + Math.round(percentHealthLeft / (100 - percentHealthLeft) * timeLeft * 10) / 10);
        return Math.round(T2K * 10) / 10;
    },



    CheckResults_viewFight: function () {
        // Check if on monster page (nm_top.jpg for Volcanic Dragon)
        var webSlice = this.CheckForImage('dragon_title_owner.jpg');
        if (!webSlice) {
            webSlice = this.CheckForImage('nm_top.jpg');
            if (!webSlice) {
                gm.log('Can not find identifier for monster fight page.');
                return;
            }
        }

        // Get name and type of monster
        var monster = nHtml.GetText(webSlice);

        if (this.CheckForImage('nm_volcanic_title.jpg')) {
            monster = monster.match(new RegExp(".+'s ")) + 'Bahamut, the Volcanic Dragon';
            monster = monster.trim();
        } else {
            monster = monster.substring(0, monster.indexOf('You have (')).trim();
        }

        var fort = null;
        var monstType = '';
        if (this.CheckForImage('raid_1_large.jpg')) {
            monstType = 'Raid I';
        } else if (this.CheckForImage('raid_b1_large.jpg')) {
            monstType = 'Raid II';
        } else {
            monstType = this.getMonstType(monster);
        }

        if (!global.is_firefox) {
            if (nHtml.FindByAttr(webSlice, 'img', 'uid', gm.getValue('FBID', 'x'))) {
                monster = monster.replace(new RegExp(".+'s "), 'Your ');
            }
        } else {
            if (nHtml.FindByAttr(webSlice, 'img', 'uid', unsafeWindow.Env.user)) {
                monster = monster.replace(new RegExp(".+'s "), 'Your ');
            }
        }

        var now = (new Date().getTime());
        gm.setListObjVal('monsterOl', monster, 'review', now.toString());
		gm.setValue('monsterRepeatCount', 0);

        var lastDamDone = gm.getListObjVal('monsterOl', monster, 'Damage', 0);
        gm.setListObjVal('monsterOl', monster, 'Type', monstType);
        // Extract info
        var time = [];
        var boss_name = '';
        var boss = '';
        var group_name = '';
        var attacker = '';
        //var phase = '';
        var currentPhase = 0;
        var miss = '';
        var fortPct = null;

        if (this.monsterInfo[monstType] && this.monsterInfo[monstType].fort) {
            if (monstType == "Deathrune" || monstType == 'Ice Elemental') {
                gm.setListObjVal('monsterOl', monster, 'Fort%', 100);
            } else {
                gm.setListObjVal('monsterOl', monster, 'Fort%', 0);
            }
            // Check for mana forcefield
            var img = this.CheckForImage('bar_dispel');
            if (img) {
                var manaHealth = img.parentNode.style.width;
                manaHealth = manaHealth.substring(0, manaHealth.length - 1);
                fortPct = 100 - Number(manaHealth);
            } else {
                // Check fortify stuff
                img = this.CheckForImage('seamonster_ship_health');
                if (img) {
                    var shipHealth = img.parentNode.style.width;
                    fortPct = shipHealth.substring(0, shipHealth.length - 1);
                    if (monstType == "Legion" || monstType.indexOf('Elemental') >= 0) {
                        img = this.CheckForImage('repair_bar_grey');
                        if (img) {
                            var extraHealth = img.parentNode.style.width;
                            extraHealth = extraHealth.substring(0, extraHealth.length - 1);
                            fortPct = Math.round(Number(fortPct) * (100 / (100 - Number(extraHealth))));
                        }
                    }
                } else {
                    // Check party health - Volcanic dragon
                    img = this.CheckForImage('nm_green');
                    if (img) {
                        var partyHealth = img.parentNode.style.width;
                        fortPct = partyHealth.substring(0, partyHealth.length - 1);
                    }
                }
            }

            if (fortPct !== null) {
                gm.setListObjVal('monsterOl', monster, 'Fort%', (Math.round(fortPct * 10)) / 10);
            }
        }

        var damDone = 0;
        // Get damage done to monster
        webSlice = nHtml.FindByAttrContains(document.body, "td", "class", "dragonContainer");
        if (webSlice) {
            webSlice = nHtml.FindByAttrContains(webSlice, "td", "valign", "top");
            if (webSlice) {
                if (!global.is_firefox) {
                    webSlice = nHtml.FindByAttrContains(webSlice, "a", "href", "keep.php?user=" + gm.getValue('FBID', 'x'));
                } else {
                    webSlice = nHtml.FindByAttrContains(webSlice, "a", "href", "keep.php?user=" + unsafeWindow.Env.user);
                }

                if (webSlice) {
                    var damList = null;
                    if (monstType == "Serpent" || monstType.indexOf('Elemental') >= 0 || monstType == "Deathrune") {
                        //damList = nHtml.GetText(webSlice.parentNode.nextSibling.nextSibling).trim().split("/");
                        damList = nHtml.GetText(webSlice.parentNode.parentNode.nextSibling.nextSibling).trim().split("/");
                        fort = this.NumberOnly(damList[1]);
                        damDone = this.NumberOnly(damList[0]) + fort;
                        gm.setListObjVal('monsterOl', monster, 'Fort', fort);
                    } else {
                        //damList = nHtml.GetText(webSlice.parentNode.nextSibling.nextSibling).trim();
                        damList = nHtml.GetText(webSlice.parentNode.parentNode.nextSibling.nextSibling).trim();
                        damDone = this.NumberOnly(damList);
                    }

                    gm.setListObjVal('monsterOl', monster, 'Damage', damDone);
                    //if (damDone) gm.log("Damage done = " + gm.getListObjVal('monsterOl',monster,'Damage'));
                } else {
                    gm.log("Player hasn't done damage yet");
                }
            } else {
                gm.log("couldn't get top table");
            }
        } else {
            gm.log("couldn't get dragoncontainer");
        }

        var monsterTicker1 = nHtml.FindByAttrContains(document.body, "div", "id", "app46755028429_monsterTicker");
        var monsterTicker2 = nHtml.FindByAttrContains(document.body, "span", "id", "app46755028429_monsterTicker");
        if (monsterTicker1 || monsterTicker2) {
            //gm.log("Monster ticker found.");
            time = $("#app46755028429_monsterTicker").text().split(":");
        } else {
            gm.log("Could not locate Monster ticker.");
        }

        var monsterConditions = gm.getListObjVal('monsterOl', monster, 'conditions', '');
        if (/:ac\b/.test(monsterConditions)) {
            var counter = parseInt(gm.getValue('monsterReviewCounter', -3), 10);
            var monsterList = gm.getList('monsterOl');
            if (counter >= 0 && monsterList[counter].indexOf(monster) >= 0 &&
                (nHtml.FindByAttrContains(document.body, 'a', 'href', '&action=collectReward') ||
                 nHtml.FindByAttrContains(document.body, 'input', 'alt', 'Collect Reward'))) {
                gm.log('Collecting Reward');
                gm.setListObjVal('monsterOl', monster, 'review', "1");
                gm.setValue('monsterReviewCounter', counter -= 1);
                gm.setListObjVal('monsterOl', monster, 'status', 'Collect Reward');
                if (monster.indexOf('Siege') >= 0) {
                    if (nHtml.FindByAttrContains(document.body, 'a', 'href', '&rix=1')) {
                        gm.setListObjVal('monsterOl', monster, 'rix', 1);
                    } else {
                        gm.setListObjVal('monsterOl', monster, 'rix', 2);
                    }
                }
            }
        }

        var hp = 0;
        var monstHealthImg = '';
        if (monstType == 'Volcanic Dragon') {
            monstHealthImg = 'nm_red.jpg';
        } else {
            monstHealthImg = 'monster_health_background.jpg';
        }

        if (time.length == 3  && this.CheckForImage(monstHealthImg)) {
            gm.setListObjVal('monsterOl', monster, 'TimeLeft', time[0] + ":" + time[1]);
            var hpBar = null;
            var imgHealthBar = nHtml.FindByAttrContains(document.body, "img", "src", monstHealthImg);
            if (imgHealthBar) {
                //gm.log("Found monster health div.");
                var divAttr = imgHealthBar.parentNode.getAttribute("style").split(";");
                var attrWidth = divAttr[1].split(":");
                hpBar = attrWidth[1].trim();
            } else {
                gm.log("Could not find monster health div.");
            }

            if (hpBar) {
                hp = Math.round(hpBar.replace(/%/, '') * 10) / 10; //fix two 2 decimal places
                gm.setListObjVal('monsterOl', monster, 'Damage%', hp);
                boss = this.monsterInfo[monstType];
                if (!boss) {
                    gm.log('Unknown monster');
                    return;
                }
            }

            if (boss && boss.siege) {
                if (monstType.indexOf('Volcanic') >= 0) {
                    miss = $.trim($("#app46755028429_action_logs").prev().children().eq(1).children().eq(2).text().replace(new RegExp(".*:\\s*Need (\\d+) more answered calls to launch"), "$1"));
                    //miss = $.trim($("#app46755028429_action_logs").prev().children().eq(1).children().eq(2).children().eq(2).text().replace(/.*:\s*Need (\d+) more answered calls to launch/, "$1"));
                    currentPhase = Math.min($("img[src*=" + boss.siege_img + "]").size(), boss.siege);
                } else {
                    if (monstType.indexOf('Raid') >= 0) {
                        miss = $("img[src*=" + boss.siege_img + "]").parent().parent().text().replace(new RegExp(".*:\\s*Need (\\d+) more to launch"), "$1").trim();
                    } else {
                        miss = $.trim($("#app46755028429_action_logs").prev().children().eq(3).children().eq(2).children().eq(1).text().replace(new RegExp(".*:\\s*Need (\\d+) more answered calls to launch"), "$1"));
                    }

                    var divSeigeLogs = document.getElementById("app46755028429_siege_log");
                    if (divSeigeLogs && !currentPhase) {
                        //gm.log("Found siege logs.");
                        var divSeigeCount = divSeigeLogs.getElementsByTagName("div").length;
                        if (divSeigeCount) {
                            currentPhase = Math.round(divSeigeCount / 4) + 1;
                        } else {
                            gm.log("Could not count siege logs.");
                        }
                    } else {
                        gm.log("Could not find siege logs.");
                    }
                }

                var phaseText = Math.min(currentPhase, boss.siege) + "/" + boss.siege + " need " + (isNaN(+miss) ? 0 : miss);
                gm.setListObjVal('monsterOl', monster, 'Phase', phaseText);
            }

            if (boss) {
                var T2K = this.t2kCalc(boss, time, hp, currentPhase, miss);
                gm.setListObjVal('monsterOl', monster, 'T2K', T2K.toString() + ' hr');
            }
        } else {
            gm.log('Monster is dead or fled');
            gm.setListObjVal('monsterOl', monster, 'color', 'grey');
            gm.setValue('resetselectMonster', true);
            return;
        }

        boss = this.monsterInfo[monstType];
        var achLevel = this.parseCondition('ach', monsterConditions);
        if (boss && achLevel === false) {
            achLevel = boss.ach;
        }
        var maxDamage = this.parseCondition('max', monsterConditions);
        fortPct = gm.getListObjVal('monsterOl', monster, 'Fort%', '');
        var maxToFortify = (this.parseCondition('f%', monsterConditions) !== false) ? this.parseCondition('f%', monsterConditions) : gm.getNumber('MaxToFortify', 0);
        var isTarget = (monster == gm.getValue('targetFromraid', '') ||
                monster == gm.getValue('targetFrombattle_monster', '') ||
                monster == gm.getValue('targetFromfortify', ''));
        if (monster == gm.getValue('targetFromfortify', '') && fortPct > maxToFortify) {
            gm.setValue('resetselectMonster', true);
        }
        if (maxDamage && damDone >= maxDamage) {
            gm.setListObjVal('monsterOl', monster, 'color', 'red');
            gm.setListObjVal('monsterOl', monster, 'over', 'max');
            if (isTarget) {
                gm.setValue('resetselectMonster', true);
            }
        } else if ((fortPct) && fortPct < gm.getNumber('MinFortToAttack', 1)) {
            gm.setListObjVal('monsterOl', monster, 'color', 'purple');
            if (isTarget) {
                gm.setValue('resetselectMonster', true);
            }
        } else if (damDone >= achLevel && gm.getValue('AchievementMode')) {
            gm.setListObjVal('monsterOl', monster, 'color', 'orange');
            gm.setListObjVal('monsterOl', monster, 'over', 'ach');
            if (isTarget && lastDamDone < achLevel) {
                gm.setValue('resetselectMonster', true);
            }
        } else {
            gm.setListObjVal('monsterOl', monster, 'color', 'black');
        }
    },

    selectMonster: function () {
        if (!this.oneMinuteUpdate('selectMonster')) {
            return;
        }

        //gm.log('Selecting monster');
        // First we forget everything about who we already picked.
        gm.setValue('targetFrombattle_monster', '');
        gm.setValue('targetFromfortify', '');
        gm.setValue('targetFromraid', '');

        // Next we get our monster objects from the reposoitory and break them into separarte lists
        // for monster or raid.  If we are serializing then we make one list only.
        var monsterList = {};
        monsterList.battle_monster = [];
        monsterList.raid = [];
        monsterList.any = [];
        var monsterFullList = gm.getList('monsterOl', '');
        var monstPage = '';
        monsterFullList.forEach(function (monsterObj) {
            gm.setListObjVal('monsterOl', monsterObj.split(global.vs)[0], 'conditions', 'none');
            monstPage = gm.getObjVal(monsterObj, 'page');
            if (gm.getValue('SerializeRaidsAndMonsters', false)) {
                monsterList.any.push(monsterObj);
            } else if ((monstPage == 'raid') || (monstPage == 'battle_monster')) {
                monsterList[monstPage].push(monsterObj);
            }
        });

        //PLEASE NOTE BEFORE CHANGING
        //The Serialize Raids and Monsters dictates a 'single-pass' because we only need select
        //one "targetFromxxxx" to fill in. The other MUST be left blank. This is what keeps it
        //serialized!!! Trying to make this two pass logic is like trying to fit a square peg in
        //a round hole. Please reconsider before doing so.
        var selectTypes = [];
        if (gm.getValue('SerializeRaidsAndMonsters', false)) {
            selectTypes = ['any'];
        } else {
            selectTypes = ['battle_monster', 'raid'];
        }

        // We loop through for each selection type (only once if serialized between the two)
        // We then read in the users attack order list
        for (var s in selectTypes) {
            if (selectTypes.hasOwnProperty(s)) {
                var selectType = selectTypes[s];
                var firstOverAch = '';
                var firstUnderMax = '';
                var firstFortOverAch = '';
                var firstFortUnderMax = '';
                var attackOrderList = [];
                // The extra apostrophe at the end of attack order makes it match any "soandos's monster" so it always selects a monster if available
                if (selectType == 'any') {
                    var attackOrderList1 = gm.getValue('orderbattle_monster', '').split(/[\n,]/);
                    var attackOrderList2 = gm.getValue('orderraid', '').split(/[\n,]/).concat('your', "'");
                    attackOrderList = attackOrderList1.concat(attackOrderList2);
                } else {
                    attackOrderList = gm.getValue('order' + selectType, '').split(/[\n,]/).concat('your', "'");
                }

                var monster = '';
                var monsterConditions = '';
                var monstType = '';
                // Next we step through the users list getting the name and conditions
                for (var p in attackOrderList) {
                    if (attackOrderList.hasOwnProperty(p)) {
                        if (!(attackOrderList[p].trim())) {
                            continue;
                        }

                        var attackOrderName = attackOrderList[p].match(new RegExp("^[^:]+")).toString().trim().toLowerCase();
                        monsterConditions = attackOrderList[p].replace(new RegExp("^[^:]+"), '').toString().trim();
                        var monsterListCurrent = monsterList[selectType];
                        // Now we try to match the users name agains our list of monsters
                        for (var m in monsterListCurrent) {
                            if (monsterListCurrent.hasOwnProperty(m)) {
                                var monsterObj = monsterListCurrent[m];
                                monster = monsterObj.split(global.vs)[0];
                                monstPage = gm.getObjVal(monsterObj, 'page');

                                // If we set conditions on this monster already then we do not reprocess
                                if (gm.getListObjVal('monsterOl', monster, 'conditions') != 'none') {
                                    continue;
                                }

                                //If this monster does not match, skip to next one
                                // Or if this monster is dead, skip to next one
                                // Or if this monster is not the correct type, skip to next one
                                if ((monster.toLowerCase().indexOf(attackOrderName) < 0) || (selectType != 'any' && monstPage != selectType)) {
                                    continue;
                                }

                                //Monster is a match so we set the conditions
                                gm.setListObjVal('monsterOl', monster, 'conditions', monsterConditions);

                                // If it's complete or collect rewards, no need to process further
                                var color = gm.getObjVal(monsterObj, 'color', '');
                                if (color == 'grey') {
                                    continue;
                                }

                                // checkMonsterDamage would have set our 'color' and 'over' values. We need to check
                                // these to see if this is the monster we should select/
                                var over = gm.getObjVal(monsterObj, 'over', '');
                                if (!firstUnderMax && color != 'purple') {
                                    if (over == 'ach') {
                                        if (!firstOverAch) {
                                            firstOverAch = monster;
                                        }
                                    } else if (over != 'max') {
                                        firstUnderMax = monster;
                                    }
                                }

                                var monsterFort = parseFloat(gm.getObjVal(monsterObj, 'Fort%', 0));
                                var maxToFortify = (caap.parseCondition('f%', monsterConditions)  !== false) ? caap.parseCondition('f%', monsterConditions) : gm.getNumber('MaxToFortify', 0);
                                monstType = this.getMonstType(monster);
                                //gm.log(monster + ' monsterFort < maxToFortify ' + (monsterFort < maxToFortify) + ' caap.monsterInfo[monstType] ' + caap.monsterInfo[monstType]+ ' caap.monsterInfo[monstType].fort ' + caap.monsterInfo[monstType].fort);
                                if (!firstFortUnderMax && monsterFort < maxToFortify &&
                                        monstPage == 'battle_monster' &&
                                        caap.monsterInfo[monstType] &&
                                        caap.monsterInfo[monstType].fort) {
                                    if (over == 'ach') {
                                        if (!firstFortOverAch) {
                                            //gm.log('hitit');
                                            firstFortOverAch = monster;
                                        }
                                    } else if (over != 'max') {
                                        //gm.log('norm hitit');
                                        firstFortUnderMax = monster;
                                    }
                                }
                            }
                        }
                    }
                }

                // Now we use the first under max/under achievement that we found. If we didn't find any under
                // achievement then we use the first over achievement
                monster = firstUnderMax;
                if (!monster) {
                    monster = firstOverAch;
                }
                if (selectType != 'raid') {
                    gm.setValue('targetFromfortify', firstFortUnderMax);
                    if (!gm.getValue('targetFromfortify', '')) {
                        gm.setValue('targetFromfortify', firstFortOverAch);
                    }
                    //gm.log('fort under max ' + firstFortUnderMax + ' fort over Ach ' + firstFortOverAch + ' fort target ' + gm.getValue('targetFromfortify', ''));
                }

                // If we've got a monster for this selection type then we set the GM variables for the name
                // and stamina requirements
                if (monster) {
                    monstPage = gm.getListObjVal('monsterOl', monster, 'page');
                    gm.setValue('targetFrom' + monstPage, monster);
                    monsterConditions = gm.getListObjVal('monsterOl', monster, 'conditions');
                    monstType = gm.getListObjVal('monsterOl', monster, 'Type', '');
                    if (monstPage == 'battle_monster') {
                        if (caap.monsterInfo[monstType] && caap.monsterInfo[monstType].staUse) {
                            gm.setValue('MonsterStaminaReq', caap.monsterInfo[monstType].staUse);
                        } else if ((caap.InLevelUpMode() && caap.stats.stamina.num >= 10) || monsterConditions.match(/:pa/i)) {
                            gm.setValue('MonsterStaminaReq', 5);
                        } else if (monsterConditions.match(/:sa/i)) {
                            gm.setValue('MonsterStaminaReq', 1);
                        } else if (gm.getValue('PowerAttack')) {
                            gm.setValue('MonsterStaminaReq', 5);
                        } else {
                            gm.setValue('MonsterStaminaReq', 1);
                        }

                        if (gm.getValue('MonsterGeneral') == 'Orc King') {
                            gm.setValue('MonsterStaminaReq', gm.getValue('MonsterStaminaReq') * 5);
                        }
                    } else {
                        // Switch RaidPowerAttack
                        if (gm.getValue('RaidPowerAttack', false) || monsterConditions.match(/:pa/i)) {
                            gm.setValue('RaidStaminaReq', 5);
                        } else if (caap.monsterInfo[monstType] && caap.monsterInfo[monstType].staUse) {
                            gm.setValue('RaidStaminaReq', caap.monsterInfo[monstType].staUse);
                        } else {
                            gm.setValue('RaidStaminaReq', 1);
                        }
                    }
                }
            }
        }

        gm.setValue('resetdashboard', true);
    },

    monsterConfirmRightPage: function (webSlice, monster) {
        // Confirm name and type of monster
        var monsterOnPage = nHtml.GetText(webSlice);
        if (caap.CheckForImage('nm_volcanic_title.jpg')) {
            monsterOnPage = monsterOnPage.match(new RegExp(".+'s ")) + 'Bahamut, the Volcanic Dragon';
            monsterOnPage = monsterOnPage.trim();
        } else {
            monsterOnPage = monsterOnPage.substring(0, monsterOnPage.indexOf('You have (')).trim();
        }

        if (!global.is_firefox) {
            if (nHtml.FindByAttr(webSlice, 'img', 'uid', gm.getValue('FBID', 'x'))) {
                monsterOnPage = monsterOnPage.replace(new RegExp(".+'s "), 'Your ');
            }
        } else {
            if (nHtml.FindByAttr(webSlice, 'img', 'uid', unsafeWindow.Env.user)) {
                monsterOnPage = monsterOnPage.replace(new RegExp(".+'s "), 'Your ');
            }
        }

        if (monster != monsterOnPage) {
            gm.log('Looking for ' + monster + ' but on ' + monsterOnPage + '. Going back to select screen');
            var monstPage = gm.getListObjVal('monsterOl', monster, 'page');
            return this.NavigateTo('keep,' + monstPage);
        }
    },
    /*-------------------------------------------------------------------------------------\
    MonsterReview is a primary action subroutine to mange the monster and raid list
    on the dashboard
    \-------------------------------------------------------------------------------------*/
    MonsterReview: function () {
    /*-------------------------------------------------------------------------------------\
    We do monster review once an hour.  Some routines may reset this timer to drive
    MonsterReview immediately.
    \-------------------------------------------------------------------------------------*/
        if (!this.WhileSinceDidIt('monsterReview', 60 * 60)) {
            return false;
        }

    /*-------------------------------------------------------------------------------------\
    We get the monsterReviewCounter.  This will be set to -3 if we are supposed to refresh
    the monsterOl completely. Otherwise it will be our index into how far we are into
    reviewing monsterOl.
    \-------------------------------------------------------------------------------------*/
        var counter = parseInt(gm.getValue('monsterReviewCounter', -3), 10);
        if (counter == -3) {
            gm.setValue('monsterOl', '');
            gm.setValue('monsterReviewCounter', counter += 1);
            return true;
        }
        if (counter == -2) {
            if (this.NavigateTo('battle_monster', 'tab_monster_on.jpg')) {
                gm.setValue('reviewDone', 0);
                return true;
            }
            if (gm.getValue('reviewDone', 1) > 0) {
                gm.setValue('monsterReviewCounter', counter += 1);
            } else {
                return true;
            }
        }
        if (counter == -1) {
            if (this.NavigateTo(this.battlePage + ',raid', 'tab_raid_on.gif')) {
                gm.setValue('reviewDone', 0);
                return true;
            }
            if (gm.getValue('reviewDone', 1) > 0) {
                gm.setValue('monsterReviewCounter', counter += 1);
            } else {
                return true;
            }
        }

        if (!(gm.getValue('monsterOl', ''))) {
            return false;
        }

    /*-------------------------------------------------------------------------------------\
    Now we step through the monsterOl objects. We set monsterReviewCounter to the next
    index for the next reiteration since we will be doing a click and return in here.
    \-------------------------------------------------------------------------------------*/
        var monsterObjList = gm.getList('monsterOl');
        while (counter < monsterObjList.length) {
            var monsterObj = monsterObjList[counter];
            if (!monsterObj) {
                gm.setValue('monsterReviewCounter', counter += 1);
                continue;
            }
    /*-------------------------------------------------------------------------------------\
    If we looked at this monster more recently than an hour ago, skip it
    \-------------------------------------------------------------------------------------*/
            if (!caap.WhileSinceDidIt(gm.getObjVal(monsterObj, 'review'), 60 * 60) ||
						gm.getValue('monsterRepeatCount', 0) > 2) {
                gm.setValue('monsterReviewCounter', counter += 1);
				gm.setValue('monsterRepeatCount', 0);
                continue;
            }
    /*-------------------------------------------------------------------------------------\
    We get our monster link
    \-------------------------------------------------------------------------------------*/
            var monster = monsterObj.split(global.vs)[0];
            this.SetDivContent('battle_mess', 'Reviewing/sieging ' + counter + '/' + monsterObjList.length + ' ' + monster);
            var link = gm.getObjVal(monsterObj, 'Link');
    /*-------------------------------------------------------------------------------------\
    If the link is good then we get the url and any conditions for monster
    \-------------------------------------------------------------------------------------*/
            if (/href/.test(link)) {
                link = link.split("'")[1];
                var conditions = gm.getObjVal(monsterObj, 'conditions');
    /*-------------------------------------------------------------------------------------\
    If the autocollect tyoken was specified then we set the link to do auto collect. If
    the conditions indicate we should not do sieges then we fix the link.
    \-------------------------------------------------------------------------------------*/
                if ((conditions) && (/:ac\b/.test(conditions)) && gm.getObjVal(monsterObj, 'status') == 'Collect Reward') {
                    link += '&action=collectReward';
                    if (monster.indexOf('Siege') >= 0) {
                        link += '&rix=' + gm.getObjVal(monsterObj, 'rix', '2');
                    }

                    link = link.replace('&action=doObjective', '');
                } else if (((conditions) && (conditions.match(':!s'))) || !gm.getValue('DoSiege', true) || this.stats.stamina.num === 0) {
                    link = link.replace('&action=doObjective', '');
                }
    /*-------------------------------------------------------------------------------------\
    Now we use ajaxSendLink to display the monsters page.
    \-------------------------------------------------------------------------------------*/
                gm.log('Reviewing ' + counter + '/' + monsterObjList.length + ' ' + monster);
                gm.setValue('ReleaseControl', true);
                link = link.replace('http://apps.facebook.com/castle_age/', '');
                link = link.replace('?', '?twt2&');
                //gm.log("Link: " + link);
                //gm.setListObjVal('monsterOl', monster, 'review','pending');
                this.ClickAjax(link);
				gm.setValue('monsterRepeatCount', gm.getValue('monsterRepeatCount', 0) + 1);
                gm.setValue('resetselectMonster', true);
                gm.setValue('resetdashboard', true);
                return true;
            }
        }
    /*-------------------------------------------------------------------------------------\
    All done.  Set timer and tell selectMonster and dashboard they need to do thier thing.
    We set the monsterReviewCounter to do a full refresh next time through.
    \-------------------------------------------------------------------------------------*/
        this.JustDidIt('monsterReview');
        gm.setValue('resetselectMonster', true);
        gm.setValue('resetdashboard', true);
        gm.setValue('monsterReviewCounter', -3);
        gm.log('Done with monster/raid review.');
        this.SetDivContent('battle_mess', '');

    },

    Monsters: function () {
    ///////////////// Reivew/Siege all monsters/raids \\\\\\\\\\\\\\\\\\\\\\

        if (gm.getValue('WhenMonster') == 'Stay Hidden' && this.NeedToHide() && this.CheckStamina('Monster', 1)) {
            gm.log("Stay Hidden Mode: We're not safe. Go battle.");
            this.SetDivContent('battle_mess', 'Not Safe For Monster. Battle!');
            return false;
        }

        if (!this.CheckTimer('NotargetFrombattle_monster')) {
            return false;
        }

    ///////////////// Individual Monster Page \\\\\\\\\\\\\\\\\\\\\\

    // Establish a delay timer when we are 1 stamina below attack level. Timer includes 5 min for stamina tick plus user defined random interval
        if (!this.InLevelUpMode() && this.stats.stamina.num == (gm.getValue('MonsterStaminaReq', 1) - 1) && this.CheckTimer('battleTimer') && gm.getValue('seedTime', 0) > 0) {
            this.SetTimer('battleTimer', 5 * 60 + Math.floor(Math.random() * gm.getValue('seedTime', 0)));
            this.SetDivContent('battle_mess', 'Monster Delay Until ' + this.DisplayTimer('battleTimer'));
            return false;
        }

        if (!this.CheckTimer('battleTimer')) {
            if (this.stats.stamina.num < gm.getValue('MaxIdleStamina', this.stats.stamina.max)) {
                this.SetDivContent('fight_mess', 'Monster Delay Until ' + this.DisplayTimer('battleTimer'));
                return false;
            }
        }

        var fightMode = '';
        // Check to see if we should fortify, attack monster, or battle raid
        var monster = gm.getValue('targetFromfortify');
        if (monster && caap.CheckEnergy(10, gm.getValue('WhenFortify', 'Energy Available'), 'fortify_mess')) {
            fightMode = gm.setValue('fightMode', 'Fortify');
        } else {
            monster = gm.getValue('targetFrombattle_monster');
            if (monster && this.CheckStamina('Monster', gm.getValue('MonsterStaminaReq', 1)) && gm.getListObjVal('monsterOl', monster, 'page') == 'battle_monster') {
                fightMode = gm.setValue('fightMode', 'Monster');
            } else {
                this.SetTimer('NotargetFrombattle_monster', 60);
                return false;
            }
        }

        // Set right general
        //var monstType = gm.getListObjVal('monsterOl', monster, 'Type', 'Dragon');
        if (this.SelectGeneral(fightMode + 'General')) {
            return true;
        }

        // Check if on engage monster page
        var imageTest = '';
        if (caap.getMonstType(monster) == 'Volcanic Dragon') {
            imageTest = 'nm_top.jpg';
        } else {
            imageTest = 'dragon_title_owner.jpg';
        }
        var webSlice = this.CheckForImage(imageTest);
        if (webSlice) {
            if (this.monsterConfirmRightPage(webSlice, monster)) {
                return true;
            }

            var attackButton = null;
            // Find the attack or fortify button
            if (fightMode == 'Fortify') {
                attackButton = this.CheckForImage('seamonster_fortify.gif');
                if (!attackButton) {
                    attackButton = nHtml.FindByAttrContains(document.body, "input", "src", 'nm_secondary_');
                    if (!attackButton) {
                        attackButton = this.CheckForImage('button_dispel.gif');
                        if (!attackButton) {
                            attackButton = this.CheckForImage('attack_monster_button3.jpg');
                        }
                    }
                }
            } else if (gm.getValue('MonsterStaminaReq', 1) == 1) {
                // not power attack only normal attacks
                attackButton = this.CheckForImage('attack_monster_button.jpg');
                if (!attackButton) {
                    attackButton = this.CheckForImage('event_attack1.gif');
                    if (!attackButton) {
                        attackButton = this.CheckForImage('seamonster_attack.gif');
                        if (!attackButton) {
                            attackButton = this.CheckForImage('event_attack2.gif');
                            if (!attackButton) {
                                attackButton = this.CheckForImage('attack_monster_button2.jpg');
                            }

                            if (attackButton) {
                                gm.setValue('MonsterStaminaReq', 5);
                            }
                        }
                    }
                }
            } else {
                // power attack or if not seamonster power attack or if not regular attack - need case for seamonster regular attack?
                attackButton = this.CheckForImage('attack_monster_button2.jpg');
                if (!attackButton) {
                    attackButton = this.CheckForImage('nm_primary_');
                    if (!attackButton) {
                        attackButton = this.CheckForImage('event_attack2.gif');
                        if (!attackButton) {
                            attackButton = this.CheckForImage('seamonster_power.gif');
                            if (!attackButton) {
                                attackButton = this.CheckForImage('event_attack1.gif');
                                if (!attackButton) {
                                    attackButton = this.CheckForImage('attack_monster_button.jpg');
                                }

                                if (attackButton) {
                                    gm.setValue('MonsterStaminaReq', 1);
                                }
                            }
                        }
                    }
                }
            }

            if (attackButton) {
                var attackMess = '';
                if (fightMode == 'Fortify') {
                    attackMess = 'Fortifying ' + monster;
                } else {
                    attackMess = (gm.getValue('MonsterStaminaReq', 1) >= 5 ? 'Power' : 'Single') + ' Attacking ' + monster;
                }

                gm.log(attackMess);
                this.SetDivContent('battle_mess', attackMess);
                gm.setValue('ReleaseControl', true);
                caap.Click(attackButton, 8000);
                return true;
            }
        }

    ///////////////// Check For Monster Page \\\\\\\\\\\\\\\\\\\\\\

        if (this.NavigateTo('keep,battle_monster', 'tab_monster_on.jpg')) {
            return true;
        }

        if (gm.getValue('clearCompleteMonsters', false) && this.completeButton.battle_monster) {
            caap.Click(this.completeButton.battle_monster, 1000);
            gm.log('Cleared a completed monster');
            this.completeButton.battle_monster = '';
            return true;
        }

        var firstMonsterButtonDiv = this.CheckForImage('dragon_list_btn_');
        if (!global.is_firefox) {
            if ((firstMonsterButtonDiv) && !(firstMonsterButtonDiv.parentNode.href.match('user=' + gm.getValue('FBID', 'x')) ||
                                             firstMonsterButtonDiv.parentNode.href.match(/alchemy\.php/))) {
                gm.log('On another player\'s keep.');
                return this.NavigateTo('keep,battle_monster');
            }
        } else {
            if ((firstMonsterButtonDiv) && !(firstMonsterButtonDiv.parentNode.href.match('user=' + unsafeWindow.Env.user) ||
                                             firstMonsterButtonDiv.parentNode.href.match(/alchemy\.php/))) {
                gm.log('On another player\'s keep.');
                return this.NavigateTo('keep,battle_monster');
            }
        }

        var engageButton = this.monsterEngageButtons[monster];
        if (engageButton) {
            this.SetDivContent('battle_mess', 'Opening ' + monster);
            caap.Click(engageButton);
            return true;
        } else {
            this.SetTimer('NotargetFrombattle_monster', 60);
            gm.log('No "Engage" button for ' + monster);
            return false;
        }
    },

    /////////////////////////////////////////////////////////////////////
    //                          COMMON FIGHTING FUNCTIONS
    /////////////////////////////////////////////////////////////////////

    DemiPoints: function () {
        if (!gm.getValue('DemiPointsFirst')) {
            return false;
        }

        if (this.CheckForImage('battle_on.gif')) {
            var smallDeity = this.CheckForImage('symbol_tiny_1.jpg');
            if (smallDeity) {
                var demiPointList = nHtml.GetText(smallDeity.parentNode.parentNode.parentNode).match(/\d+ \/ 10/g);
                gm.setList('DemiPointList', demiPointList);
                gm.log('DemiPointList: ' + demiPointList);
                if (this.CheckTimer('DemiPointTimer')) {
                    gm.log('Set DemiPointTimer to 24 hours, and check if DemiPoints done');
                    this.SetTimer('DemiPointTimer', 6 * 60 * 60);
                }

                gm.setValue('DemiPointsDone', true);
                for (var demiPtItem in demiPointList) {
                    if (demiPointList.hasOwnProperty(demiPtItem)) {
                        var demiPoints = demiPointList[demiPtItem].split('/');
                        if (parseInt(demiPoints[0], 10) < 10 && gm.getValue('DemiPoint' + demiPtItem)) {
                            gm.setValue('DemiPointsDone', false);
                            break;
                        }
                    }
                }

                gm.log('Demi Point Timer ' + this.DisplayTimer('DemiPointTimer') + ' demipoints done is  ' + gm.getValue('DemiPointsDone', false));
            }
        }

        if (this.CheckTimer('DemiPointTimer')) {
            return this.NavigateTo(this.battlePage, 'battle_on.gif');
        }

        if (!gm.getValue('DemiPointsDone', true)) {
            return this.Battle('DemiPoints');
        }
    },

    minutesBeforeLevelToUseUpStaEnergy : 5,

    InLevelUpMode: function () {
        if (!gm.getValue('EnableLevelUpMode', true)) {
            return false;
        }

        if (!(this.stats.levelTime)) {
            return false;
        }

        var now = new Date();
        if ((this.stats.levelTime.getTime() - now.getTime()) < this.minutesBeforeLevelToUseUpStaEnergy * 60 * 1000) {
            return true;
        }

        return false;
    },

    CheckStamina: function (battleOrBattle, attackMinStamina) {
        if (!attackMinStamina) {
            attackMinStamina = 1;
        }

        var when = gm.getValue('When' + battleOrBattle, '');
        if (when == 'Never') {
            return false;
        }

        if (!this.stats.stamina || !this.stats.health) {
            this.SetDivContent('battle_mess', 'Health or stamina not known yet.');
            return false;
        }

        if (this.stats.health.num < 10) {
            this.SetDivContent('battle_mess', "Need health to " + battleOrBattle.toLowerCase() + ": " + this.stats.health.num + "/10");
            return false;
        }

        if (when == 'At X Stamina') {
            if (this.InLevelUpMode() && this.stats.stamina.num >= attackMinStamina) {
                this.SetDivContent('battle_mess', 'Burning stamina to level up');
                return true;
            }
            var staminaMF = battleOrBattle + 'Stamina';
            if (gm.getValue('BurnMode_' + staminaMF, false) || this.stats.stamina.num >= gm.getValue('X' + staminaMF, 1)) {
                if (this.stats.stamina.num < attackMinStamina || this.stats.stamina.num <= gm.getValue('XMin' + staminaMF, 0)) {
                    gm.setValue('BurnMode_' + staminaMF, false);
                    return false;
                }

                this.SetDivContent('battle_mess', 'Burning stamina');
                gm.setValue('BurnMode_' + staminaMF, true);
                return true;
            } else {
                gm.setValue('BurnMode_' + staminaMF, false);
            }

            this.SetDivContent('battle_mess', 'Waiting for stamina: ' + this.stats.stamina.num + "/" + gm.getValue('X' + staminaMF, 1));
            return false;
        }

        if (when == 'At Max Stamina') {
            if (!gm.getValue('MaxIdleStamina', 0)) {
                gm.log("Changing to idle general to get Max Stamina");
                this.PassiveGeneral();
            }

            if (this.stats.stamina.num >= gm.getValue('MaxIdleStamina')) {
                this.SetDivContent('battle_mess', 'Using max stamina');
                return true;
            }

            if (this.InLevelUpMode() && this.stats.stamina.num >= attackMinStamina) {
                this.SetDivContent('battle_mess', 'Burning all stamina to level up');
                return true;
            }

            this.SetDivContent('battle_mess', 'Waiting for max stamina: ' + this.stats.stamina.num + "/" + gm.getValue('MaxIdleStamina'));
            return false;
        }

        if (this.stats.stamina.num >= attackMinStamina) {
            return true;
        }

        this.SetDivContent('battle_mess', 'Waiting for more stamina: ' + this.stats.stamina.num + "/" + attackMinStamina);
        return false;
    },
    /*-------------------------------------------------------------------------------------\
    NeedToHide will return true if the current stamina and health indicate we need to bring
    our health down through battles (hiding).  It also returns true if there is no other outlet
    for our stamina (currently this just means Monsters, but will eventually incorporate
    other stamina uses).
    \-------------------------------------------------------------------------------------*/
    NeedToHide: function () {
        if (gm.getValue('WhenMonster', '') == 'Never') {
            gm.log('Stay Hidden Mode: Monster battle not enabled');
            return true;
        }
        if (!gm.getValue('targetFrombattle_monster', '')) {
            gm.log('Stay Hidden Mode: No monster to battle');
            return true;
        }
    /*-------------------------------------------------------------------------------------\
    The riskConstant helps us determine how much we stay in hiding and how much we are willing
    to risk coming out of hiding.  The lower the riskConstant, the more we spend stamina to
    stay in hiding. The higher the risk constant, the more we attempt to use our stamina for
    non-hiding activities.  The below matrix shows the default riskConstant of 1.7

                S   T   A   M   I   N   A
                1   2   3   4   5   6   7   8   9        -  Indicates we use stamina to hide
        H   10  -   -   +   +   +   +   +   +   +        +  Indicates we use stamina as requested
        E   11  -   -   +   +   +   +   +   +   +
        A   12  -   -   +   +   +   +   +   +   +
        L   13  -   -   +   +   +   +   +   +   +
        T   14  -   -   -   +   +   +   +   +   +
        H   15  -   -   -   +   +   +   +   +   +
            16  -   -   -   -   +   +   +   +   +
            17  -   -   -   -   -   +   +   +   +
            18  -   -   -   -   -   +   +   +   +

    Setting our riskConstant down to 1 will result in us spending out stamina to hide much
    more often:

                S   T   A   M   I   N   A
                1   2   3   4   5   6   7   8   9        -  Indicates we use stamina to hide
        H   10  -   -   +   +   +   +   +   +   +        +  Indicates we use stamina as requested
        E   11  -   -   +   +   +   +   +   +   +
        A   12  -   -   -   +   +   +   +   +   +
        L   13  -   -   -   -   +   +   +   +   +
        T   14  -   -   -   -   -   +   +   +   +
        H   15  -   -   -   -   -   -   +   +   +
            16  -   -   -   -   -   -   -   +   +
            17  -   -   -   -   -   -   -   -   +
            18  -   -   -   -   -   -   -   -   -

    \-------------------------------------------------------------------------------------*/
        var riskConstant = gm.getNumber('HidingRiskConstant', 1.7);
    /*-------------------------------------------------------------------------------------\
    The formula for determining if we should hide goes something like this:

        If  (health - (estimated dmg from next attacks) puts us below 10)  AND
            (current stamina will be at least 5 using staminatime/healthtime ratio)
        Then stamina can be used/saved for normal process
        Else stamina is used for us to hide

    \-------------------------------------------------------------------------------------*/
        if ((this.stats.health.num - ((this.stats.stamina.num - 1) * riskConstant) < 10) && (this.stats.stamina.num * (5 / 3) >= 5)) {
            return false;
        } else {
            return true;
        }
    },

    /////////////////////////////////////////////////////////////////////
    //                          MONSTER FINDER
    /////////////////////////////////////////////////////////////////////

    mf_attackButton: null,

    monstArgs: {
        'doaid': {
            fname: 'Any Weapon Aid',
            sname: 'Aid',
            urlid: 'doObjective'
        },
        'urlix': {
            fname: 'Any Monster',
            sname: 'Any',
            urlid: 'user'
        },
        'legio': {
            fname: 'Battle of the Dark Legion',
            sname: 'Legion',
            nname: 'castle',
            imgid: 'cta_castle_',
            twt2: 'corc_'
        },
        'hydra': {
            fname: 'Cronus, The World Hydra ',
            sname: 'Cronus',
            nname: 'hydra',
            imgid: 'twitter_hydra_objective',
            twt2: 'hydra_'
        },
        /*
        'elems': {
            fname: 'Any Elemental',
            sname:'Elemental',
            nname:'elems',
            imgid:'',
            twt2: ''
        },
        */
        'earth': {
            fname: 'Genesis, The Earth Elemental ',
            sname: 'Genesis',
            nname: 'earthelemental',
            imgid: 'cta_earth_',
            twt2: 'earth_'
        },
        'ice': {
            fname: 'Ragnarok, The Ice Elemental ',
            sname: 'Ragnarok',
            nname: 'iceelemental',
            imgid: 'cta_water_',
            twt2: 'water_'
        },
        'kull': {
            fname: 'Kull, the Orc Captain',
            sname: 'Kull',
            nname: 'captain',
            imgid: 'cta_orc_captain.gif',
            twt2: 'bosscaptain'
        },
        'gilda': {
            fname: 'Gildamesh, the Orc King',
            sname: 'Gildamesh',
            nname: 'king',
            imgid: 'cta_orc_king.gif',
            twt2: 'bossgilda'
        },
        'colos': {
            fname: 'Colossus of Terra',
            sname: 'Colossus',
            nname: 'stone',
            imgid: 'cta_stone.gif',
            twt2: 'bosscolossus'
        },
        'sylva': {
            fname: 'Sylvanas the Sorceress Queen',
            sname: 'Sylvanas',
            nname: 'sylvanas',
            imgid: 'cta_sylvanas.gif',
            twt2: 'bosssylvanus'
        },
        'mephi': {
            fname: 'Mephistophles',
            sname: 'Mephisto',
            nname: 'mephi',
            imgid: 'cta_mephi.gif',
            twt2: 'bossmephistopheles'
        },
        'keira': {
            fname: 'Keira',
            sname: 'keira',
            nname: 'keira',
            imgid: 'cta_keira.gif',
            twt2: 'boss_img'
        },
        'lotus': {
            fname: 'Lotus Ravenmoore',
            sname: 'Ravenmoore',
            nname: 'lotus',
            imgid: 'cta_lotus.gif',
            twt2: 'bosslotus_'
        },
        'skaar': {
            fname: 'Skaar Deathrune',
            sname: 'Deathrune',
            nname: 'skaar',
            imgid: 'cta_death_',
            twt2: 'death_',
            deadimg: 'cta_death_dead.gif'
        },
        'serps': {
            fname: 'Any Serpent',
            sname: 'Serpent',
            nname: 'seamonster',
            imgid: 'twitter_seamonster_',
            twt2: 'sea_'
        },
        'eserp': {
            fname: 'Emerald Serpent',
            sname: 'Emerald Serpent',
            nname: 'greenseamonster',
            imgid: 'twitter_seamonster_green_1',
            twt2: 'sea_'
        },
        'sserp': {
            fname: 'Saphire Serpent',
            sname: 'Saphire Serpent',
            nname: 'blueseamonster',
            imgid: 'twitter_seamonster_blue_1',
            twt2: 'sea_'
        },
        'aserp': {
            fname: 'Amethyst Serpent',
            sname: 'Amethyst Serpent',
            nname: 'purpleseamonster',
            imgid: 'twitter_seamonster_purple_1',
            twt2: 'sea_'
        },
        'rserp': {
            fname: 'Ancient Serpent',
            sname: 'Ancient Serpent',
            nname: 'redseamonster',
            imgid: 'twitter_seamonster_red_1',
            twt2: 'sea_'
        },
        'drags': {
            fname: 'Any Dragon',
            sname: 'Dragon',
            nname: 'drag',
            imgid: '_dragon.gif',
            twt2: 'dragon_'
        },
        'edrag': {
            fname: 'Emerald Dragon',
            sname: 'Emerald Dragon',
            nname: 'greendragon',
            imgid: 'cta_green_dragon.gif',
            twt2: 'dragon_'
        },
        'fdrag': {
            fname: 'Frost Dragon',
            sname: 'Frost Dragon',
            nname: 'bluedragon',
            imgid: 'cta_blue_dragon.gif',
            twt2: 'dragon_'
        },
        'gdrag': {
            fname: 'Gold Dragon',
            sname: 'Gold Dragon',
            nname: 'yellowdragon',
            imgid: 'cta_yellow_dragon.gif"',
            twt2: 'dragon_'
        },
        'rdrag': {
            fname: 'Ancient Red Dragon',
            sname: 'Red Dragon',
            nname: 'reddragon',
            imgid: 'cta_red_dragon.gif',
            twt2: 'dragon_'
        },
        'deas': {
            fname: 'Any Deathrune Raid',
            sname: 'Deathrune Raid',
            nname: 'deathrune',
            imgid: 'raid_deathrune_',
            twt2: 'deathrune_'
        },
        'a1dea': {
            fname: 'Deathrune Raid I Part 1',
            sname: 'Deathrune Raid A1',
            nname: 'deathrunea1',
            imgid: 'raid_deathrune_a1.gif',
            twt2: 'deathrune_'
        },
        'a2dea': {
            fname: 'Deathrune Raid I Part 2',
            sname: 'Deathrune Raid A2',
            nname: 'deathrunea2',
            imgid: 'raid_deathrune_a2.gif',
            twt2: 'deathrune_'
        },
        'b1dea': {
            fname: 'Deathrune Raid II Part 1',
            sname: 'Deathrune Raid B1',
            nname: 'deathruneb1',
            imgid: 'raid_deathrune_b1.gif',
            twt2: 'deathrune_'
        },
        'b2dea': {
            fname: 'Deathrune Raid II Part 2',
            sname: 'Deathrune Raid B2',
            nname: 'deathruneb2',
            imgid: 'raid_deathrune_b2.gif',
            twt2: 'deathrune_'
        }
    },

    monstGroups: {
        'doaid': {
            monst: 'legio~hydra~earth~ice~sylva~skaar~a1dea~a2dea~b1dea~b2dea'
        },
        'world': {
            monst: 'legio~hydra~earth~ice',
            max: '5'
        },
        'serps': {
            monst: 'eserp~sserp~aserp~rserp'
        },
        'drags': {
            monst: 'edrag~fdrag~gdrag~rdrag'
        },
        'deas': {
            monst: 'a1dea~a2dea~b1dea~b2dea'
        },
        'elems': {
            monst: 'earth~ice'
        }
    },

    MonsterFinder: function () {
        if (!gm.getValue("MonsterFinderUse", false) || this.stats.stamina.num < gm.getValue("MonsterFinderMinStam", 20) || this.stats.health.num < 10) {
            return false;
        }

        var urlix = gm.getValue("urlix", "").replace("~", "");
        if (urlix === "" && gm.getValue("mfStatus", "") != "OpenMonster" && caap.WhileSinceDidIt("clearedMonsterFinderLinks", 24 * 60 * 60)) {
            gm.setValue("mfStatus", "");
            gm.log("Resetting monster finder history");
            this.clearLinks();
        }

        gm.log("All checks passed to enter Monster Finder");
        if (window.location.href.indexOf("filter=app_46755028429") < 0) {
            var mfstatus = gm.getValue("mfStatus", "");
            if (mfstatus == "OpenMonster") {
                caap.CheckMonster();
                return true;
            } else if (mfstatus == "MonsterFound") {
                caap.VisitUrl("http://apps.facebook.com/castle_age" + gm.getValue("navLink"));
                gm.setValue("mfStatus", "");
                return true;
            } else if ((mfstatus == "TestMonster" && this.WhileSinceDidIt('checkedFeed', 60 * 60 * 2)) || (!this.WhileSinceDidIt('checkedFeed', 60 * gm.getValue("MonsterFinderFeedMin", 5)))) {
                caap.selectMonst();
            } else {
                if (global.is_chrome) {
                    caap.VisitUrl("http://apps.facebook.com/?filter=app_46755028429&show_hidden=true&ignore_self=true&sk=lf", 0);
                } else {
                    caap.VisitUrl("http://www.facebook.com/?filter=app_46755028429&show_hidden=true&ignore_self=true&sk=lf", 0);
                }

                gm.setValue("mfStatus", "MFOFB");
                return false;
            }
        }
    },

    MonsterFinderOnFB: function () {
        if (gm.getValue("mfStatus", "") != "MFOFB") {
            return false;
        }

        gm.setValue("mfStatus", "Running");
        var delayPer = 10000;
        var iterations = 2;
        gm.setValue("delayPer", delayPer);
        gm.setValue("iterations", iterations);
        gm.setValue("iterationsRun", 0);
        gm.log("Set mostRecentFeed");
        this.JustDidIt("checkedFeed");
        gm.setValue("monstersExhausted", false);
        this.bottomScroll();
    },

    CheckMonster: function () {
        //Look for Attack Button
        if (gm.getValue("mfStatus") != "OpenMonster") {
            return false;
        }

        gm.log("Checking Monster: " + gm.getValue("navLink"));
        this.mf_attackButton = this.CheckForImage('attack_monster_button.jpg');
        if (!this.mf_attackButton) {
            this.mf_attackButton = this.CheckForImage('seamonster_power.gif');
            if (!this.mf_attackButton) {
                this.mf_attackButton = this.CheckForImage('attack_monster_button2.jpg');
                if (!this.mf_attackButton) {
                    this.mf_attackButton = this.CheckForImage('seamonster_power.gif');
                    if (!this.mf_attackButton) {
                        this.mf_attackButton = this.CheckForImage('attack_monster_button.jpg');
                        if (!this.mf_attackButton) {
                            this.mf_attackButton = this.CheckForImage('event_attack1.gif');
                            if (!this.mf_attackButton) {
                                this.mf_attackButton = this.CheckForImage('event_attack2.gif');
                                if (!this.mf_attackButton) {
                                    this.mf_attackButton = this.CheckForImage('raid_attack_button.gif');
                                }
                            }
                        }
                    }
                }
            }
        }

        if (this.mf_attackButton) {
            var dam = this.CheckResults_viewFight();
            gm.log("Found Attack Button.  Dam: " + dam);
            if (!dam) {
                gm.log("No Damage to monster, Attacking");
                caap.Click(this.mf_attackButton);
                window.setTimeout(function () {
                    gm.log("Hand off to Monsters section");
                    gm.setValue("urlixc", gm.getValue("urlixc", "~") + "~" + gm.getValue("navLink").replace("http://apps.facebook.com/castle_age", ""));
                    //caap.maintainUrl(gm.getValue("navLink").replace("http://apps.facebook.com/castle_age",""));
                    gm.setValue("mfStatus", "MonsterFound");
                    //caap.DeceiveDidIt("NotargetFrombattle_monster");
                    gm.setValue("navLink", "");
                    //caap.VisitUrl("http://apps.facebook.com/castle_age/battle_monster.php");
                    caap.NavigateTo('battle_monster');
                    gm.log("Navigate to battle_monster");
                    window.setTimeout(function () {
                        gm.setValue('resetselectMonster', true);
                        gm.setValue('LastAction', "Idle");
                        gm.log("resetselectMonster");
                        return true;
                    }, 4000);

                }, 4000);
                return false;
            } else {
                gm.log("Already attacked this monster, find new one");
                gm.setValue("urlixc", gm.getValue("urlixc", "~") + "~" + gm.getValue("navLink").replace("http://apps.facebook.com/castle_age", ""));
                //this.maintainUrl(gm.getValue("navLink").replace("http://apps.facebook.com/castle_age",""));
                gm.setValue("mfStatus", "TestMonster");
                gm.setValue("waitMonsterLoad", 0);
                return true;
            }
        } else {
            gm.log("No Attack Button");
            if (gm.getValue("waitMonsterLoad", 0) < 2) {
                gm.log("No Attack Button, Pass" + gm.getValue("waitMonsterLoad"));
                gm.setValue("waitMonsterLoad", gm.getValue("waitMonsterLoad", 0) + 1);
                gm.setValue("LastAction", "Idle");
                return true;
            } else {
                gm.log("No Attack Button, Find New Monster");
                gm.setValue("urlixc", gm.getValue("urlixc", "~") + gm.getValue("navLink").replace("http://apps.facebook.com/castle_age", ""));
                //this.maintainUrl(gm.getValue("navLink").replace("http://apps.facebook.com/castle_age",""));
                gm.setValue("mfStatus", "TestMonster");
                gm.setValue("waitMonsterLoad", 0);
                return true;
            }
        }
    },

    mfMain: function () {
        gm.log("Do Stuff " + new Date());
        if (gm.getValue("urlix", "") === "") {
            this.clearLinks();
        }

        //this.maintainAllUrl();
        //this.redirectLinks();
        this.handleCTA();
        gm.log("Scroll Up");
        nHtml.ScrollToTop();
        gm.log("Select Monster");
        this.selectMonst();
    },

    redirectLinks: function () {
        for (var x = 0; x < document.getElementsByTagName("a").length; x += 1) {
            document.getElementsByTagName('a')[x].target = "child_frame";
        }
    },

    bottomScroll: function () {
        nHtml.ScrollToBottom();
        //gm.log("Scroll To Bottom " + new Date() );
        nHtml.setTimeout(function () {
            caap.olderPosts();
        }, gm.getValue("delayPer", 60000));
    },

    olderPosts: function () {
        var itRun = gm.getValue("iterationsRun", 0);
        if (itRun > 0) {
            //var showMore = nHtml.getX('//a[@class=\'PagerMoreLink\']', document, nHtml.xpath.unordered);
            var showMore = nHtml.FindByAttrContains(document, "a", "class", "PagerMoreLink");
            if (showMore) {
                gm.log("Showing more ...");
                caap.Click(showMore);
                gm.log("Link clicked.");
            } else {
                gm.log("PagerMoreLink not found!");
            }
        }

        //this.NavigateTo("Older Posts");
        gm.setValue("iterationsRun", itRun += 1);
        gm.log("Get More Iterations " + gm.getValue("iterationsRun") + " of " + gm.getValue("iterations") + " " + new Date());
        if (gm.getValue("iterationsRun") < gm.getValue("iterations")) {
            nHtml.setTimeout(function () {
                caap.bottomScroll();
            }, gm.getValue("delayPer", 60000));
        } else {
            //gm.log("Made it Here, Try mfMain");
            nHtml.setTimeout(function () {
                caap.mfMain();
            }, gm.getValue("delayPer", 120000));
        }
    },

    selectMonst: function () {
        if (gm.getValue("monstersExhausted", false) === true) {
            return false;
        }

        gm.log("Select Monst Function");
        var monstPriority = gm.getValue("MonsterFinderOrder");

        gm.log("Monst Priority: " + monstPriority);

        var monstArray = monstPriority.split("~");
        gm.log("MonstArray: " + monstArray[0]);
        for (var x = 0; x < monstArray.length; x += 1) {
            if (gm.getValue(monstArray[x], "~") == "~") {
                gm.setValue(monstArray[x], "~");
            }

            gm.log("monstArray[x]: " + monstArray[x]);
            var monstType = monstArray[x];
            var monstList = gm.getValue(monstArray[x], "~");
            var monstLinks = monstList.replace(/~~/g, "~").split("~");
            var numlinks = 0;
            gm.log("Inside MonstArray For Loop " + monstArray[x] + " - Array[" + (monstLinks.length - 1) + "] " + gm.getValue(monstArray[x]).replace("~", "~\n"));
            for (var z = 0; z < monstLinks.length; z += 1) {
                if (monstLinks[z]) {
                    var link = monstLinks[z].replace("http://apps.facebook.com/castle_age", "");
                    var urlixc = gm.getValue("urlixc", "~");
                    // + "  UrlixC: " + urlixc);
                    if (urlixc.indexOf(link) == -1) {
                        gm.log("Navigating to Monst: " + monstArray[x] + "  Link: " + link);
                        link = "http://apps.facebook.com/castle_age" + link;
                        gm.setValue("navLink", link);
                        gm.setValue('clickUrl', link);
                        this.VisitUrl(link);
                        //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                        // code is unreachable because of this.VisitUrl
                        //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                        gm.setValue("mfStatus", "OpenMonster");
                        gm.setValue("LastAction", "Monsters");
                        this.waitMilliSecs =  10000;
                        return true;
                    } else {
                        numlinks += 1;
                        gm.log("Trimming already checked URL, Monst Type: " + monstType);
                        //var newVal = gm.getValue(monstArray[x],"~").replace("~" + link, "");
                        gm.setValue(monstType, gm.getValue(monstType).replace("~" + link, "").replace(/~~/g, "~"), "~");
                    }
                }
            }

            gm.log("Links Already Visited: " + monstArray[x] + " #:" + numlinks);
        }

        gm.log("All Monsters Tested");
        gm.setValue("monstersExhausted", true);
        gm.setValue("mfStatus", "");
        var numurl = gm.getValue("urlix", "~");
        if (nHtml.CountInstances(numurl) > 100) {
            gm.log("Idle- Resetting Monster Searcher Values, #-" + numurl);
            caap.clearLinks(true);
            gm.setValue("LastAction", "");
        }

        gm.setValue('clickUrl', "http://apps.facebook.com/castle_age/index.php?bm=1");
        this.VisitUrl("http://apps.facebook.com/castle_age/index.php?bm=1");
        return false;
    },

    clearLinks: function (resetall) {
        gm.log("Clear Links");
        if (resetall === true) {
            gm.setValue("navLink", "");
            gm.setValue("mfStatus", "");
            gm.setValue("waitMonsterLoad", 0);
            gm.setValue("urlixc", "~");
        }

        gm.setValue("urlix", "~");
        gm.setValue('doaid', '~');
        gm.setValue('legio', '~');
        gm.setValue('hydra', '~');
        gm.setValue('earth', '~');
        gm.setValue('ice', '~');
        gm.setValue('kull', '~');
        gm.setValue('gilda', '~');
        gm.setValue('colos', '~');
        gm.setValue('sylva', '~');
        gm.setValue('mephi', '~');
        gm.setValue('keira', '~');
        gm.setValue('lotus', '~');
        gm.setValue('skaar', '~');
        gm.setValue('serps', '~');
        gm.setValue('eserp', '~');
        gm.setValue('sserp', '~');
        gm.setValue('aserp', '~');
        gm.setValue('rserp', '~');
        gm.setValue('drags', '~');
        gm.setValue('edrag', '~');
        gm.setValue('fdrag', '~');
        gm.setValue('gdrag', '~');
        gm.setValue('rdrag', '~');
        gm.setValue('deas', '~');
        gm.setValue('a1dea', '~');
        gm.setValue('a2dea', '~');
        gm.setValue('b1dea', '~');
        gm.setValue('b2dea', '~');

        this.JustDidIt("clearedMonsterFinderLinks");
    },

    handleCTA: function () {
        var ctas = nHtml.getX('//div[@class=\'GenericStory_Body\']', document, nHtml.xpath.unordered);
        gm.log("Number of entries- " + ctas.snapshotLength);
        for (var x = 0; x < ctas.snapshotLength; x += 1) {
            var url = nHtml.getX('./div[2]/div/div/a/@href', ctas.snapshotItem(x), nHtml.xpath.string).replace("http://apps.facebook.com/castle_age", "");
            var fid = nHtml.Gup("user", url);
            var mpool = nHtml.Gup("mpool", url);
            var action = nHtml.Gup("action", url);
            var src = nHtml.getX('./div[2]/div/div/a/div/img/@src', ctas.snapshotItem(x), nHtml.xpath.string);
            var time = nHtml.getX('./form/span/span/a/abbr/@title', ctas.snapshotItem(x), nHtml.xpath.string);
            var monst = '';
            var urlixc = gm.getValue("urlixc", "~");
            if (src) {
                if (urlixc.indexOf(url) >= 0) {
                    //gm.log("Monster Already Checked");
                } else if (src.indexOf("cta_hydra_") >= 0 || src.indexOf("twitter_hydra_objective") >= 0) { //Hydra
                    monst = gm.getValue("hydra", "~");
                    if (monst.indexOf(url) == -1) {
                        gm.setValue("hydra", gm.getValue("hydra", "") + "~" + url);
                    }
                } else if (src.indexOf("cta_castle_") >= 0) { //Battle of the Dark Legion (Orcs)
                    monst = gm.getValue("legio", "~");
                    if (monst.indexOf(url) == -1) {
                        gm.setValue("legio", gm.getValue("legio", "") + "~" + url);
                    }
                } else if (src.indexOf("cta_earth_") >= 0) { //Genesis, the Earth Elemental
                    monst = gm.getValue("earth", "~");
                    if (monst.indexOf(url) == -1) {
                        gm.setValue("earth", gm.getValue("earth", "") + "~" + url);
                    }
                } else if (src.indexOf("cta_water_") >= 0) { //Ragnarok, the Ice Elemental
                    monst = gm.getValue("ice", "~");
                    if (monst.indexOf(url) == -1) {
                        gm.setValue("ice", gm.getValue("ice", "") + "~" + url);
                    }
                } else if (src.indexOf("raid_deathrune_") >= 0) { //Deathrune Raids
                    monst = gm.getValue("deas", "~");
                    if (monst.indexOf(url) == -1) {
                        gm.setValue("deas", gm.getValue("deas", "") + "~" + url);
                    }
                    if (src.indexOf("raid_deathrune_a1.gif") >= 0) { // Deathrune Raid Part 1 Under Level 50 Summoner (a1)
                        monst = gm.getValue("a1dea", "~");
                        if (monst.indexOf(url) == -1) {
                            gm.setValue("a1dea", gm.getValue("a1dea", "") + "~" + url);
                        }
                    } else if (src.indexOf("raid_deathrune_a2.gif") >= 0) { // Deathrune Raid Part 2 Under Level 50 Summoner (a2)
                        monst = gm.getValue("a2dea", "~");
                        if (monst.indexOf(url) == -1) {
                            gm.setValue("a2dea", gm.getValue("a2dea", "") + "~" + url);
                        }
                    } else if (src.indexOf("raid_deathrune_b1.gif") >= 0) { // Deathrune Raid Part 1 Over Level 50 Summoner (b1)
                        monst = gm.getValue("b1dea", "~");
                        if (monst.indexOf(url) == -1) {
                            gm.setValue("b1dea", gm.getValue("b1dea", "") + "~" + url);
                        }
                    } else if (src.indexOf("raid_deathrune_b2.gif") >= 0) { // Deathrune Raid Part 2 Over Level 50 Summoner (b2)
                        monst = gm.getValue("b2dea", "~");
                        if (monst.indexOf(url) == -1) {
                            gm.setValue("b2dea", gm.getValue("b2dea", "") + "~" + url);
                        }
                    }
                } else if (src.indexOf("_dragon.gif") >= 0) { //Dragons
                    monst = gm.getValue("drags", "~");
                    if (monst.indexOf(url) == -1) {
                        gm.setValue("drags", gm.getValue("drags", "") + "~" + url);
                    }

                    if (src.indexOf("cta_red_dragon.gif") >= 0) { // Red Dragon
                        monst = gm.getValue("rdrag", "~");
                        if (monst.indexOf(url) == -1) {
                            gm.setValue("rdrag", gm.getValue("rdrag", "") + "~" + url);
                        }
                    } else if (src.indexOf("cta_yellow_dragon.gif") >= 0) {  // Gold Dragon
                        monst = gm.getValue("gdrag", "~");
                        if (monst.indexOf(url) == -1) {
                            gm.setValue("gdrag", gm.getValue("gdrag", "") + "~" + url);
                        }
                    } else if (src.indexOf("cta_blue_dragon.gif") >= 0) { // Frost Dragon
                        monst = gm.getValue("fdrag", "~");
                        if (monst.indexOf(url) == -1) {
                            gm.setValue("fdrag", gm.getValue("fdrag", "") + "~" + url);
                        }
                    } else if (src.indexOf("cta_green_dragon.gif") >= 0) { // Emerald Dragon
                        monst = gm.getValue("edrag", "~");
                        if (monst.indexOf(url) == -1) {
                            gm.setValue("edrag", gm.getValue("edrag", "") + "~" + url);
                        }
                    }
                } else if (src.indexOf("twitter_seamonster_") >= 0 && src.indexOf("_1.jpg") >= 0) { // Sea Serpents
                    monst = gm.getValue("serps", "~");
                    if (monst.indexOf(url) == -1) {
                        gm.setValue("serps", gm.getValue("serps", "") + "~" + url);
                    }

                    if (src.indexOf("twitter_seamonster_purple_1") >= 0) { // Amethyt Serpent
                        monst = gm.getValue("aserp", "~");
                        if (monst.indexOf(url) == -1) {
                            gm.setValue("aserp", gm.getValue("aserp", "") + "~" + url);
                        }
                    } else if (src.indexOf("twitter_seamonster_red_1") >= 0) { // Ancient Serpent (red)
                        monst = gm.getValue("rserp", "~");
                        if (monst.indexOf(url) == -1) {
                            gm.setValue("rserp", gm.getValue("rserp", "") + "~" + url);
                        }
                    } else if (src.indexOf("twitter_seamonster_blue_1") >= 0) { // Saphire Serpent
                        monst = gm.getValue("sserp", "~");
                        if (monst.indexOf(url) == -1) {
                            gm.setValue("sserp", gm.getValue("sserp", "") + "~" + url);
                        }
                    } else if (src.indexOf("twitter_seamonster_green_1") >= 0) { // Emerald Serpent
                        monst = gm.getValue("eserp", "~");
                        if (monst.indexOf(url) == -1) {
                            gm.setValue("eserp", gm.getValue("eserp", "") + "~" + url);
                        }
                    }
                } else if (src.indexOf("cta_death") >= 0 && src.indexOf("cta_death_dead.gif") == -1) { // skaar
                    monst = gm.getValue("skaar", "~");
                    if (monst.indexOf(url) == -1) {
                        gm.setValue("skaar", gm.getValue("skaar", "") + "~" + url);
                    }
                } else if (src.indexOf("cta_lotus.gif") >= 0) { // Lotus
                    monst = gm.getValue("lotus", "~");
                    if (monst.indexOf(url) == -1) {
                        gm.setValue("lotus", gm.getValue("lotus", "") + "~" + url);
                    }
                } else if (src.indexOf("cta_keira.gif") >= 0) { // Keira
                    monst = gm.getValue("keira", "~");
                    if (monst.indexOf(url) == -1) {
                        gm.setValue("keira", gm.getValue("keira", "") + "~" + url);
                    }
                } else if (src.indexOf("cta_mephi.gif") >= 0) { // Mephisto
                    monst = gm.getValue("mephi", "~");
                    if (monst.indexOf(url) == -1) {
                        gm.setValue("mephi", gm.getValue("mephi", "") + "~" + url);
                    }
                } else if (src.indexOf("cta_sylvanas.gif") >= 0) { //Sylvanas
                    monst = gm.getValue("sylva", "~");
                    if (monst.indexOf(url) == -1) {
                        gm.setValue("sylva", gm.getValue("sylva", "") + "~" + url);
                    }
                } else if (src.indexOf("cta_stone.gif") >= 0) { //Colossus of Terra
                    monst = gm.getValue("colos", "~");
                    if (monst.indexOf(url) == -1) {
                        gm.setValue("colos", gm.getValue("colos", "") + "~" + url);
                    }
                } else if (src.indexOf("cta_orc_king.gif") >= 0) { //Gildamesh
                    monst = gm.getValue("gilda", "~");
                    if (monst.indexOf(url) == -1) {
                        gm.setValue("gilda", gm.getValue("gilda", "") + "~" + url);
                    }
                } else if (src.indexOf("cta_orc_captain.gif") >= 0) { //Kull
                    monst = gm.getValue("kull", "~");
                    if (monst.indexOf(url) == -1) {
                        gm.setValue("kull", gm.getValue("kull", "") + "~" + url);
                    }
                }
            }

            var urlix = gm.getValue("urlix", "~");
            var doaid = gm.getValue("doaid", "~");
            if (fid && action) {
                if (action == "doObjective") {
                    if (urlixc.indexOf(url) == -1 && doaid.indexOf(url) == -1) {
                        doaid += "~" + url;
                        gm.setValue("doaid", doaid);
                    }
                }
            }

            if (fid && mpool) {
                if (urlixc.indexOf(url) == -1 && urlix.indexOf(url) == -1) {
                    urlix += "~" + url;
                    gm.setValue("urlix", urlix);
                }
            }
        }

        gm.log("Completed Url Handling");
        this.JustDidIt("checkedFeed");
    },

    /////////////////////////////////////////////////////////////////////
    //                          POTIONS
    /////////////////////////////////////////////////////////////////////

    /*
    CheckResults_keep: function () {
    },
    */

    AutoPotions: function () {
        try {
            if (!gm.getValue('AutoPotion', true) ||
                !(this.WhileSinceDidIt('AutoPotionTimer', 6 * 60 * 60)) ||
                !(this.WhileSinceDidIt('AutoPotionTimerDelay', 10 * 60))) {
                return false;
            }

            var checkConsumables = nHtml.FindByAttr(document.body, "div", "class", "statsTTitle");
            if (!checkConsumables) {
                gm.log("Going to keep for potions");
                if (this.NavigateTo('keep')) {
                    return true;
                }
            }

            gm.log("Checking energy potions");
            var energyPotions = $("img[title='Energy Potion']").parent().next().text().replace(new RegExp("[^0-9\\.]", "g"), "");
            if (!energyPotions) {
                energyPotions = 0;
            }

            gm.log("Energy Potions: " + energyPotions);
            if (energyPotions >= gm.getNumber("energyPotionsSpendOver", 40)) {
                gm.setValue("Consume_Energy", true);
                gm.log("Energy potions ready to consume");
            }

            gm.log("Checking stamina potions");
            var staminaPotions = $("img[title='Stamina Potion']").parent().next().text().replace(new RegExp("[^0-9\\.]", "g"), "");
            if (!staminaPotions) {
                staminaPotions = 0;
            }

            gm.log("Stamina Potions: " + staminaPotions);
            if (staminaPotions >= gm.getNumber("staminaPotionsSpendOver", 40)) {
                gm.setValue("Consume_Stamina", true);
                gm.log("Stamina potions ready to consume");
            }

            gm.log("Checking experience to next level");
            //gm.log("Experience to next level: " + this.stats.exp.dif);
            //gm.log("Potions experience set: " + gm.getNumber("potionsExperience", 20));
            if ((gm.getValue("Consume_Energy", false) || gm.getValue("Consume_Stamina", false)) &&
                this.stats.exp.dif <= gm.getNumber("potionsExperience", 20)) {
                gm.log("Not spending potions, experience to next level condition. Delaying 10 minutes");
                this.JustDidIt('AutoPotionTimerDelay');
                return true;
            }

            if (this.stats.energy.num < this.stats.energy.max - 10 &&
                energyPotions > gm.getNumber("energyPotionsKeepUnder", 35) &&
                gm.getValue("Consume_Energy", false)) {
                gm.log("Spending energy potions");
                var energySlice = nHtml.FindByAttr(document.body, "form", "id", "app46755028429_consume_1");
                if (energySlice) {
                    var energyButton = nHtml.FindByAttrContains(energySlice, "input", "src", 'potion_consume.gif');
                    if (energyButton) {
                        gm.log("Consume energy potion");
                        caap.Click(energyButton);
                        // Check consumed should happen here if needed
                        return true;
                    } else {
                        gm.log("Could not find consume energy button");
                    }
                } else {
                    gm.log("Could not find energy consume form");
                }

                return false;
            } else {
                gm.setValue("Consume_Energy", false);
                gm.log("Energy potion conditions not met");
            }

            if (this.stats.stamina.num < this.stats.stamina.max - 10 &&
                staminaPotions > gm.getNumber("staminaPotionsKeepUnder", 35) &&
                gm.getValue("Consume_Stamina", false)) {
                gm.log("Spending stamina potions");
                var staminaSlice = nHtml.FindByAttr(document.body, "form", "id", "app46755028429_consume_2");
                if (staminaSlice) {
                    var staminaButton = nHtml.FindByAttrContains(staminaSlice, "input", "src", 'potion_consume.gif');
                    if (staminaButton) {
                        gm.log("Consume stamina potion");
                        caap.Click(staminaButton);
                        // Check consumed should happen here if needed
                        return true;
                    } else {
                        gm.log("Could not find consume stamina button");
                    }
                } else {
                    gm.log("Could not find stamina consume form");
                }

                return false;
            } else {
                gm.setValue("Consume_Stamina", false);
                gm.log("Stamina potion conditions not met");
            }

            this.JustDidIt('AutoPotionTimer');
            return true;
        } catch (e) {
            gm.log("ERROR in AutoPotion: " + e);
            return false;
        }
    },

    /*-------------------------------------------------------------------------------------\
    AutoAlchemy perform aclchemy combines for all recipes that do not have missing
    ingredients.  By default, it also will not combine Battle Hearts.
    First we make sure the option is set and that we haven't been here for a while.
    \-------------------------------------------------------------------------------------*/
    AutoAlchemy: function () {
        try {
            if (!gm.getValue('AutoAlchemy', false)) {
                return false;
            }

            if (!this.CheckTimer('AlchemyTimer')) {
                return false;
            }
    /*-------------------------------------------------------------------------------------\
    Now we navigate to the Alchemy Recipe page.
    \-------------------------------------------------------------------------------------*/
            if (!this.NavigateTo('keep,alchemy', 'alchemy_banner.jpg')) {
                var button = null;
                if (document.getElementById('app46755028429_recipe_list').className != 'show_items') {
                    button = nHtml.FindByAttrContains(document.body, 'div', 'id', 'alchemy_item_tab');
                    if (button) {
                        this.Click(button, 5000);
                        return true;
                    } else {
                        gm.log('Cant find recipe div');
                        return false;
                    }
                }
    /*-------------------------------------------------------------------------------------\
    We close the results of our combines so they don't hog up our screen
    \-------------------------------------------------------------------------------------*/
                button = this.CheckForImage('help_close_x.gif');
                if (button) {
                    this.Click(button, 1000);
                    return true;
                }
    /*-------------------------------------------------------------------------------------\
    Now we get all of the recipes and step through them one by one
    \-------------------------------------------------------------------------------------*/
                var ss = document.evaluate(".//div[@class='alchemyRecipeBack']", document.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                for (var s = 0; s < ss.snapshotLength; s += 1) {
                    var recipeDiv = ss.snapshotItem(s);
    /*-------------------------------------------------------------------------------------\
    If we are missing an ingredient then skip it
    \-------------------------------------------------------------------------------------*/
                    if (nHtml.FindByAttrContains(recipeDiv, 'div', 'class', 'missing')) {
                        // gm.log('Skipping Recipe');
                        continue;
                    }
    /*-------------------------------------------------------------------------------------\
    If we are skipping battle hearts then skip it
    \-------------------------------------------------------------------------------------*/
                    if (this.CheckForImage('raid_hearts', recipeDiv) && !gm.getValue('AutoAlchemyHearts', false)) {
                        gm.log('Skipping Hearts');
                        continue;
                    }
    /*-------------------------------------------------------------------------------------\
    Find our button and click it
    \-------------------------------------------------------------------------------------*/
                    button = nHtml.FindByAttrXPath(recipeDiv, 'input', "@type='image'");
                    if (button) {
                        this.Click(button, 2000);
                        return true;
                    } else {
                        gm.log('Cant Find Item Image Button');
                    }
                }
    /*-------------------------------------------------------------------------------------\
    All done. Set the timer to check back in 3 hours.
    \-------------------------------------------------------------------------------------*/
                this.SetTimer('AlchemyTimer', 3 * 60 * 60);
                return false;
            }
        } catch (e) {
            gm.log("ERROR in Alchemy: " + e);
            return false;
        }
    },

    /////////////////////////////////////////////////////////////////////
    //                          BANKING
    // Keep it safe!
    /////////////////////////////////////////////////////////////////////

    ImmediateBanking: function () {
        if (!gm.getValue("BankImmed")) {
            return false;
        }

        return this.Bank();
    },

    Bank: function () {
        var maxInCash = gm.getNumber('MaxInCash', -1);
        var minInCash = gm.getNumber('MinInCash', 0);
        if (!maxInCash || maxInCash < 0 || this.stats.cash <= minInCash || this.stats.cash < maxInCash || this.stats.cash < 10) {
            return false;
        }

        if (this.SelectGeneral('BankingGeneral')) {
            return true;
        }

        var depositButton = this.CheckForImage('btn_stash.gif');
        if (!depositButton) {
            // Cannot find the link
            return this.NavigateTo('keep');
        }

        var depositForm = depositButton.form;
        var numberInput = nHtml.FindByAttrXPath(depositForm, 'input', "@type='' or @type='text'");
        if (numberInput) {
            numberInput.value = parseInt(numberInput.value, 10) - minInCash;
        } else {
            gm.log('Cannot find box to put in number for bank deposit.');
            return false;
        }

        gm.log('Depositing into bank');
        this.Click(depositButton);
        // added a true result by default until we can find a fix for the result check
        return true;

        /*
        var checkBanked = nHtml.FindByAttrContains(div, "div", "class", 'result');
        if (checkBanked && (checkBanked.firstChild.data.indexOf("You have stashed") < 0)) {
            gm.log('Banking succeeded!');
            return true;
        }

        gm.log('Banking failed! Cannot find result or not stashed!');
        return false;
        */
    },

    RetrieveFromBank: function (num) {
        if (num <= 0) {
            return false;
        }

        var retrieveButton = this.CheckForImage('btn_retrieve.gif');
        if (!retrieveButton) {
            // Cannot find the link
            return this.NavigateTo('keep');
        }

        var minInStore = gm.getNumber('minInStore', 0);
        if (!(minInStore || minInStore <= gm.getNumber('inStore', 0) - num)) {
            return false;
        }

        var retrieveForm = retrieveButton.form;
        var numberInput = nHtml.FindByAttrXPath(retrieveForm, 'input', "@type='' or @type='text'");
        if (numberInput) {
            numberInput.value = num;
        } else {
            gm.log('Cannot find box to put in number for bank retrieve.');
            return false;
        }

        gm.log('Retrieving ' + num + ' from bank');
        gm.setValue('storeRetrieve', '');
        this.Click(retrieveButton);
        return true;
    },

    /////////////////////////////////////////////////////////////////////
    //                          HEAL
    /////////////////////////////////////////////////////////////////////

    Heal: function () {
        this.SetDivContent('heal_mess', '');
        var minToHeal = gm.getNumber('MinToHeal', 0);
        if (!minToHeal) {
            return false;
        }

        var minStamToHeal = gm.getNumber('MinStamToHeal', 0);
        if (minStamToHeal === "") {
            minStamToHeal = 0;
        }

        if (!this.stats.health) {
            return false;
        }

        if ((gm.getValue('WhenBattle', '') != 'Never') || (gm.getValue('WhenMonster', '') != 'Never')) {
            if ((this.InLevelUpMode() || this.stats.stamina.num >= this.stats.stamina.max) && this.stats.health.num < 10) {
                gm.log('Heal');
                return this.NavigateTo('keep,heal_button.gif');
            }
        }

        if (this.stats.health.num >= this.stats.health.max || this.stats.health.num > minToHeal) {
            return false;
        }

        if (this.stats.stamina.num < minStamToHeal) {
            this.SetDivContent('heal_mess', 'Waiting for stamina to heal: ' + this.stats.stamina.num + '/' + minStamToHeal);
            return false;
        }

        gm.log('Heal');
        return this.NavigateTo('keep,heal_button.gif');
    },

    /////////////////////////////////////////////////////////////////////
    //                          ELITE GUARD
    /////////////////////////////////////////////////////////////////////

    AutoElite: function () {
        if (!gm.getValue('AutoElite', false) || !(this.WhileSinceDidIt('AutoEliteGetList', 6 * 60 * 60))) {
            return false;
        }

        if (String(window.location).indexOf('party.php')) {
            var res = nHtml.FindByAttrContains(document.body, 'span', 'class', 'result_body');
            if (res) {
                res = nHtml.GetText(res);
                if (res.match(/Your Elite Guard is FULL/i)) {
                    gm.setValue('MyEliteTodo', '');
                    gm.log('elite guard is full');
                    this.JustDidIt('AutoEliteGetList');
                    gm.setValue('AutoEliteEnd', 'Full');
                    return false;
                }
            }
        }

        var user = '';
        var eliteList = gm.getValue('MyEliteTodo', '').trim();
        if (eliteList === '') {
            if (this.CheckForImage('view_army_on.gif')) {
                gm.log('load auto elite list');
                var armyList = gm.getValue('EliteArmyList', '');
                if (new RegExp("[^0-9,]").test(armyList) && /\n/.test(armyList)) {
                    armyList = armyList.replace(/\n/gi, ',');
                }

                if (armyList !== '') {
                    armyList += ',';
                }

                var ss = document.evaluate(".//img[contains(@src,'view_friends_profile')]/ancestor::a[contains(@href,'keep.php?user')]", document.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                for (var s = 0; s < ss.snapshotLength; s += 1) {
                    var a = ss.snapshotItem(s);
                    user = a.href.match(/user=\d+/i);
                    if (user) {
                        armyList += String(user).substr(5) + ',';
                    }
                }

                if (armyList !== '' || (this.stats.army <= 1)) {
                    gm.setValue('MyEliteTodo', armyList);
                }

            } else {
                return this.NavigateTo('army,army_member');
            }
        } else if (this.WhileSinceDidIt('AutoEliteReqNext', 7)) {
            user = eliteList.substring(0, eliteList.indexOf(','));
            gm.log('add elite ' + user);
            this.ClickAjax('party.php?twt=jneg&jneg=true&user=' + user);
            eliteList = eliteList.substring(eliteList.indexOf(',') + 1);
            gm.setValue('MyEliteTodo', eliteList);
            this.JustDidIt('AutoEliteReqNext');
            if (eliteList === '') {
                this.JustDidIt('AutoEliteGetList');
                gm.setValue('AutoEliteEnd', 'NoArmy');
                gm.log('Army list exhausted');
            }
        }

        return true;
    },

    /////////////////////////////////////////////////////////////////////
    //                          Arena ELITE GUARD
    /////////////////////////////////////////////////////////////////////

    ArenaElite: function () {
        if (this.WhileSinceDidIt('ArenaEliteTimer', 6 * 60 * 60)) {
            gm.setValue('ArenaEliteEnd', '');
        }

        if (!gm.getValue('ArenaEliteNeeded', false)) {
            return false;
        }

        if (String(window.location).indexOf('arena.php?user=')) {
            var res = nHtml.FindByAttrContains(document.body, 'span', 'class', 'result_body');
            if (res) {
                res = nHtml.GetText(res);
                if (res.match(new RegExp("You.+Arena Guard is FULL", "i")) || res.match(/Arena is over/i)) {
                    gm.setValue('ArenaEliteTodo', '');
                    gm.log('Arena guard is full or Arena is over');
                    gm.setValue('ArenaEliteNeeded', false);
                    gm.setValue('ArenaEliteEnd', 'Full');
                    return false;
                }
            }
        }

        var user = '';
        var eliteList = gm.getValue('ArenaEliteTodo', '').trim();
        if (eliteList === '') {
            if (this.CheckForImage('view_army_on.gif')) {
                gm.log('Load auto elite list');
                var armyList = gm.getValue('EliteArmyList', '');
                if (new RegExp("^0-9,]").test(armyList) && /\n/.test(armyList)) {
                    armyList = armyList.replace(/\n/gi, ',');
                }

                if (armyList !== '') {
                    armyList += ',';
                }

                var ss = document.evaluate(".//img[contains(@src,'view_friends_profile')]/ancestor::a[contains(@href,'keep.php?user')]", document.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                for (var s = 0; s < ss.snapshotLength; s += 1) {
                    var a = ss.snapshotItem(s);
                    user = a.href.match(/user=\d+/i);
                    if (user) {
                        armyList += String(user).substr(5) + ',';
                    }
                }

                if (armyList !== '' || (this.stats.army <= 1)) {
                    gm.setValue('ArenaEliteTodo', armyList);
                }

            } else {
                return this.NavigateTo('army,army_member');
            }
        } else if (this.WhileSinceDidIt('ArenaEliteReqNext', 7)) {
            user = eliteList.substring(0, eliteList.indexOf(','));
            gm.log('add elite ' + user);
            gm.setValue('clickUrl', "http://apps.facebook.com/castle_age/arena.php?user=" + user + "&lka=" + user + "&agtw=1&ref=nf");
            this.VisitUrl("http://apps.facebook.com/castle_age/arena.php?user=" + user + "&lka=" + user + "&agtw=1&ref=nf");
            eliteList = eliteList.substring(eliteList.indexOf(',') + 1);
            gm.setValue('ArenaEliteTodo', eliteList);
            this.JustDidIt('ArenaEliteReqNext');
            if (eliteList === '') {
                gm.setValue('ArenaEliteNeeded', false);
                gm.setValue('ArenaEliteEnd', 'NoArmy');
                this.JustDidIt('ArenaEliteTimer');
                gm.log('Army list exhausted');
            }
        }

        return true;
    },

    /////////////////////////////////////////////////////////////////////
    //                          PASSIVE GENERALS
    /////////////////////////////////////////////////////////////////////

    PassiveGeneral: function () {
        if (this.SelectGeneral('IdleGeneral')) {
            return true;
        }

        gm.setValue('MaxIdleEnergy', this.stats.energy.max);
        gm.setValue('MaxIdleStamina', this.stats.stamina.max);
        return false;
    },

    /////////////////////////////////////////////////////////////////////
    //                          AUTOINCOME
    /////////////////////////////////////////////////////////////////////

    AutoIncome: function () {
        if (this.stats.payminute < 1 && this.stats.paytime.match(/\d/) &&
                gm.getValue('IncomeGeneral') != 'Use Current') {
            this.SelectGeneral('IncomeGeneral');
            return true;
        }

        return false;
    },

    /////////////////////////////////////////////////////////////////////
    //                              AUTOGIFT
    /////////////////////////////////////////////////////////////////////

    CheckResults_army: function (resultsText) {
        // Confirm gifts actually sent
        if (resultsText.match(/^\d+ requests? sent\.$/)) {
            gm.log('Confirmed gifts sent out.');
            gm.setValue('RandomGiftPic', '');
            gm.setValue('FBSendList', '');
        }

        var listHref = $('div[style="padding: 0pt 0pt 10px 0px; overflow: hidden; float: left; width: 240px; height: 50px;"]')
            .find('a[text="Ignore"]');
        for (var i = 0; i < listHref.length; i += 1) {
            var link = "<br /><a title='This link can be used to collect the " +
                "gift when it has been lost on Facebook. !!If you accept a gift " +
                "in this manner then it will leave an orphan request on Facebook!!' " +
                "href='" + listHref[i].href.replace('ignore', 'acpt') + "'>Lost Accept</a>";
            $(link).insertAfter(
                $('div[style="padding: 0pt 0pt 10px 0px; overflow: hidden; float: left; width: 240px; height: 50px;"]')
                .find('a[href=' + listHref[i].href + ']')
            );
        }

    },

    AutoGift: function () {
        try {
            if (!gm.getValue('AutoGift')) {
                return false;
            }

            /*
            var iframeFB = document.getElementById("generic_dialog_iframe");
            if (iframeFB) {
                iframeFB.src = "//apps.facebook.com/common/blank.html";
                gm.log("iframe src set");
            }
            */

            var giftNamePic = {};
            var giftEntry = nHtml.FindByAttrContains(document.body, 'div', 'id', '_gift1');
            if (giftEntry) {
                gm.setList('GiftList', []);
                var ss = document.evaluate(".//div[contains(@id,'_gift')]", giftEntry.parentNode, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                for (var s = 0; s < ss.snapshotLength; s += 1) {
                    var giftDiv = ss.snapshotItem(s);
                    var giftName = nHtml.GetText(giftDiv).trim().replace(/!/i, '');
                    if (gm.getValue("GiftList").indexOf(giftName) >= 0) {
                        giftName += ' #2';
                    }

                    gm.listPush('GiftList', giftName);
                    giftNamePic[giftName] = this.CheckForImage('mystery', giftDiv).src.match(/[\w_\.]+$/i).toString();
                    //gm.log('Gift name: ' + giftName + ' pic ' + giftNamePic[giftName] + ' hidden ' + giftExtraGiftTF[giftName]);
                }

                //gm.log('Gift list: ' + gm.getList('GiftList'));
                if (gm.getValue('GiftChoice') == 'Get Gift List') {
                    gm.setValue('GiftChoice', 'Same Gift As Received');
                    this.SelectDropOption('GiftChoice', 'Same Gift As Received');
                }
            }

            // Go to gifts page if asked to read in gift list
            if (gm.getValue('GiftChoice', false) == 'Get Gift List' || !gm.getList('GiftList')) {
                if (this.NavigateTo('army,gift', 'giftpage_title.jpg')) {
                    return true;
                }
            }

            var giverId = [];
            // Gather the gifts
            if (gm.getValue('HaveGift', false)) {
                if (this.NavigateTo('army', 'invite_on.gif')) {
                    return true;
                }

                var acceptDiv = nHtml.FindByAttrContains(document.body, 'a', 'href', 'reqs.php#confirm_');
                var ignoreDiv = nHtml.FindByAttrContains(document.body, 'a', 'href', 'act=ignore');
                if (ignoreDiv && acceptDiv) {
                    giverId = this.userRe.exec(ignoreDiv.href);
                    if (!giverId) {
                        gm.log('Unable to find giver ID');
                        return false;
                    }

                    var profDiv = nHtml.FindByAttrContains(acceptDiv.parentNode.parentNode, 'a', 'href', 'profile.php');
                    if (!profDiv) {
                        profDiv = nHtml.FindByAttrContains(acceptDiv.parentNode.parentNode, 'div', 'style', 'overflow: hidden; text-align: center; width: 170px;');
                    }

                    var giverName = "Unknown";
                    if (profDiv) {
                        giverName = nHtml.GetText(profDiv).trim();
                    }

                    gm.setValue('GiftEntry', giverId[2] + global.vs + giverName);
                    gm.log('Giver ID = ' + giverId[2] + ' Name  = ' + giverName);
                    this.JustDidIt('ClickedFacebookURL');
                    if (global.is_chrome) {
                        acceptDiv.href = "http://apps.facebook.com/reqs.php#confirm_46755028429_0";
                    }

                    gm.setValue('clickUrl', acceptDiv.href);
                    this.VisitUrl(acceptDiv.href);
                    return true;
                }

                gm.setValue('HaveGift', false);
                return this.NavigateTo('gift');
            }

            var button = null;
            // Facebook pop-up on CA
            if (gm.getValue('FBSendList', '')) {
                button = nHtml.FindByAttrContains(document.body, 'input', 'name', 'sendit');
                if (button) {
                    gm.log('Sending gifts to Facebook');
                    this.Click(button);
                    return true;
                }

                gm.listAddBefore('ReceivedList', gm.getList('FBSendList'));
                gm.setList('FBSendList', []);
                button = nHtml.FindByAttrContains(document.body, 'input', 'name', 'ok');
                if (button) {
                    gm.log('Over max gifts per day');
                    this.JustDidIt('WaitForNextGiftSend');
                    this.Click(button);
                    return true;
                }

                gm.log('No Facebook pop up to send gifts');
                return false;
            }

            // CA send gift button
            if (gm.getValue('CASendList', '')) {
                var sendForm = nHtml.FindByAttrContains(document.body, 'form', 'id', 'req_form_');
                if (sendForm) {
                    button = nHtml.FindByAttrContains(sendForm, 'input', 'name', 'send');
                    if (button) {
                        gm.log('Clicked CA send gift button');
                        gm.listAddBefore('FBSendList', gm.getList('CASendList'));
                        gm.setList('CASendList', []);
                        caap.Click(button);
                        return true;
                    }
                }

                gm.log('No CA button to send gifts');
                gm.listAddBefore('ReceivedList', gm.getList('CASendList'));
                gm.setList('CASendList', []);
                return false;
            }

            if (!this.WhileSinceDidIt('WaitForNextGiftSend', 3 * 60 * 60)) {
                return false;
            }

            if (this.WhileSinceDidIt('WaitForNotFoundIDs', 3 * 60 * 60) && gm.getList('NotFoundIDs')) {
                gm.listAddBefore('ReceivedList', gm.getList('NotFoundIDs'));
                gm.setList('NotFoundIDs', []);
            }

            //if (gm.getValue('DisableGiftReturn', false)) {
            if (gm.getValue('DisableGiftReturn', false) || global.is_chrome) {
                gm.setList('ReceivedList', []);
            }

            var giverList = gm.getList('ReceivedList');
            if (!giverList.length) {
                return false;
            }

            if (this.NavigateTo('army,gift', 'giftpage_title.jpg')) {
                return true;
            }

            // Get the gift to send out
            if (giftNamePic.length === 0) {
                gm.log('No list of pictures for gift choices');
                return false;
            }

            var givenGiftType = '';
            var giftPic = '';
            var giftChoice = gm.getValue('GiftChoice');
            var giftList = null;
            //if (global.is_chrome) giftChoice = 'Random Gift';
            switch (giftChoice) {
            case 'Random Gift':
                giftPic = gm.getValue('RandomGiftPic');
                if (giftPic) {
                    break;
                }

                var picNum = Math.floor(Math.random() * (gm.getList('GiftList').length));
                var n = 0;
                for (var picN in giftNamePic) {
                    if (giftNamePic.hasOwnProperty(picN)) {
                        n += 1;
                        if (n == picNum) {
                            giftPic = giftNamePic[picN];
                            gm.setValue('RandomGiftPic', giftPic);
                            break;
                        }
                    }
                }
                if (!giftPic) {
                    gm.log('No gift type match. GiverList: ' + giverList);
                    return false;
                }
                break;
            case 'Same Gift As Received':
				givenGiftType = giverList[0].split(global.vs)[2];
				giftList = gm.getList('GiftList');
                gm.log('Looking for same gift as ' + givenGiftType);
                if (giftList.indexOf(givenGiftType) < 0) {
                    gm.log('No gift type match. Using first gift as default.');
					givenGiftType = gm.getList('GiftList').shift();
                }
				giftPic = giftNamePic[givenGiftType];
				break;
            default:
                giftPic = giftNamePic[gm.getValue('GiftChoice')];
                break;
            }

            // Move to gifts page
            var picDiv = this.CheckForImage(giftPic);
            if (!picDiv) {
                gm.log('Unable to find ' + giftPic);
                return false;
            } else {
                gm.log('GiftPic is ' + giftPic);
            }

            if (nHtml.FindByAttrContains(picDiv.parentNode.parentNode.parentNode.parentNode, 'div', 'style', 'giftpage_select')) {
                if (this.NavigateTo('giftpage_ca_friends_off.gif', 'giftpage_ca_friends_on.gif')) {
                    return true;
                }
            } else {
                this.NavigateTo('gift_more_gifts.gif');
                return this.NavigateTo(giftPic);
            }

            // Click on names
            var giveDiv = nHtml.FindByAttrContains(document.body, 'div', 'class', 'unselected_list');
            var doneDiv = nHtml.FindByAttrContains(document.body, 'div', 'class', 'selected_list');
            gm.setList('ReceivedList', []);
            for (var p in giverList) {
                if (giverList.hasOwnProperty(p)) {
                    if (p > 10) {
                        gm.listPush('ReceivedList', giverList[p]);
                        continue;
                    }

                    var giverData = giverList[p].split(global.vs);
                    var giverID = giverData[0];
                    var giftType = giverData[2];
                    if (giftChoice == 'Same Gift As Received' && giftType != givenGiftType && giftType != 'Unknown Gift') {
                        gm.log('giftType ' + giftType + ' givenGiftType ' + givenGiftType);
                        gm.listPush('ReceivedList', giverList[p]);
                        continue;
                    }

                    var nameButton = nHtml.FindByAttrContains(giveDiv, 'input', 'value', giverID);
                    if (!nameButton) {
                        gm.log('Unable to find giver ID ' + giverID);
                        gm.listPush('NotFoundIDs', giverList[p]);
                        this.JustDidIt('WaitForNotFoundIDs');
                        continue;
                    } else {
                        gm.log('Clicking giver ID ' + giverID);
                        this.Click(nameButton);
                    }

                    //test actually clicked
                    if (nHtml.FindByAttrContains(doneDiv, 'input', 'value', giverID)) {
                        gm.listPush('CASendList', giverList[p]);
                        gm.log('Moved ID ' + giverID);
                    } else {
                        gm.log('NOT moved ID ' + giverID);
                        gm.listPush('NotFoundIDs', giverList[p]);
                        this.JustDidIt('WaitForNotFoundIDs');
                    }
                }
            }

            return true;
        } catch (e) {
            gm.log("ERROR in AutoGift: " + e);
            return false;
        }
    },

    AcceptGiftOnFB: function () {
        try {
            if (global.is_chrome) {
                if (window.location.href.indexOf('apps.facebook.com/reqs.php') < 0 && window.location.href.indexOf('apps.facebook.com/home.php') < 0) {
                    return false;
                }
            } else {
                if (window.location.href.indexOf('www.facebook.com/reqs.php') < 0 && window.location.href.indexOf('www.facebook.com/home.php') < 0) {
                    return false;
                }
            }

            var giftEntry = gm.getValue('GiftEntry', '');
            if (!giftEntry) {
                return false;
            }

            gm.log('On FB page with gift ready to go');
            if (window.location.href.indexOf('facebook.com/reqs.php') >= 0) {
                var ss = document.evaluate(".//input[contains(@name,'/castle/tracker.php')]", document.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                for (var s = 0; s < ss.snapshotLength; s += 1) {
                    var giftDiv = ss.snapshotItem(s);
                    var user = giftDiv.name.match(/uid%3D\d+/i);
                    if (!user) {
                        continue;
                    }

                    user = String(user).substr(6);
                    if (user != this.NumberOnly(giftEntry)) {
                        continue;
                    }

                    var giftType = giftDiv.value.replace(/^Accept /i, '').trim();
                    if (gm.getList('GiftList').indexOf(giftType) < 0) {
                        gm.log('Unknown gift type.');
                        giftType = 'Unknown Gift';
                    }

                    if (gm.getValue('ReceivedList', ' ').indexOf(giftEntry) < 0) {
                        gm.listPush('ReceivedList', giftEntry + global.vs + giftType);
                    }

                    gm.log('This giver: ' + user + ' gave ' + giftType + ' Givers: ' + gm.getList('ReceivedList'));
                    caap.Click(giftDiv);
                    gm.setValue('GiftEntry', '');
                    return true;
                }
            }

            if (!this.WhileSinceDidIt('ClickedFacebookURL', 10)) {
                return false;
            }

            gm.log('Error: unable to find gift');
            if (gm.getValue('ReceivedList', ' ').indexOf(giftEntry) < 0) {
                gm.listPush('ReceivedList', giftEntry + '\tUnknown Gift');
            }

            caap.VisitUrl("http://apps.facebook.com/castle_age/army.php?act=acpt&uid=" + this.NumberOnly(giftEntry));
            gm.setValue('GiftEntry', '');
            return true;
        } catch (e) {
            gm.log("ERROR in AcceptGiftOnFB: " + e);
            return false;
        }
    },

    /////////////////////////////////////////////////////////////////////
    //                              IMMEDIATEAUTOSTAT
    /////////////////////////////////////////////////////////////////////

    ImmediateAutoStat: function () {
        if (!gm.getValue("StatImmed") || !gm.getValue('AutoStat')) {
            return false;
        }

        return caap.AutoStat();
    },

    ////////////////////////////////////////////////////////////////////
    //                      Auto Stat
    ////////////////////////////////////////////////////////////////////

    IncreaseStat: function (attribute, attrAdjust, atributeSlice) {
        try {
            var lc_attribute = attribute.toLowerCase();
            var button = '';
            switch (lc_attribute) {
            case "energy" :
                button = nHtml.FindByAttrContains(atributeSlice, 'a', 'href', 'energy_max');
                break;
            case "stamina" :
                button = nHtml.FindByAttrContains(atributeSlice, 'a', 'href', 'stamina_max');
                break;
            case "attack" :
                button = nHtml.FindByAttrContains(atributeSlice, 'a', 'href', 'attack');
                break;
            case "defense" :
                button = nHtml.FindByAttrContains(atributeSlice, 'a', 'href', 'defense');
                break;
            case "health" :
                button = nHtml.FindByAttrContains(atributeSlice, 'a', 'href', 'health_max');
                break;
            default :
                gm.log("Unable to identify attribute " + lc_attribute);
                return "Fail";
            }

            if (!button) {
                gm.log("Unable to locate upgrade button for " + lc_attribute);
                return "Fail";
            }

            var level = this.stats.level;
            var attrCurrent = parseInt(button.parentNode.parentNode.childNodes[3].firstChild.data.replace(new RegExp("[^0-9]", "g"), ''), 10);
            var energy = parseInt(nHtml.FindByAttrContains(atributeSlice, 'a', 'href', 'energy_max').parentNode.parentNode.childNodes[3].firstChild.data.replace(new RegExp("[^0-9]", "g"), ''), 10);
            var stamina = parseInt(nHtml.FindByAttrContains(atributeSlice, 'a', 'href', 'stamina_max').parentNode.parentNode.childNodes[3].firstChild.data.replace(new RegExp("[^0-9]", "g"), ''), 10);
            var attack = 0;
            var defense = 0;
            var health = 0;
            if (level >= 10) {
                attack = parseInt(nHtml.FindByAttrContains(atributeSlice, 'a', 'href', 'attack').parentNode.parentNode.childNodes[3].firstChild.data.replace(new RegExp("[^0-9]", "g"), ''), 10);
                defense = parseInt(nHtml.FindByAttrContains(atributeSlice, 'a', 'href', 'defense').parentNode.parentNode.childNodes[3].firstChild.data.replace(new RegExp("[^0-9]", "g"), ''), 10);
                health = parseInt(nHtml.FindByAttrContains(atributeSlice, 'a', 'href', 'health_max').parentNode.parentNode.childNodes[3].firstChild.data.replace(new RegExp("[^0-9]", "g"), ''), 10);
            }

            //gm.log("Energy ="+energy+" Stamina ="+stamina+" Attack ="+attack+" Defense ="+defense+" Heath ="+health);
            var ajaxLoadIcon = nHtml.FindByAttrContains(document.body, 'div', 'id', 'app46755028429_AjaxLoadIcon');
            if (!ajaxLoadIcon || ajaxLoadIcon.style.display !== 'none') {
                gm.log("Unable to find AjaxLoadIcon?");
                return "Fail";
            }

            if ((lc_attribute == 'stamina') && (this.statsPoints < 2)) {
                gm.setValue("SkillPointsNeed", 2);
                return "Fail";
            }

            gm.setValue("SkillPointsNeed", 1);
            var attrAdjustNew = attrAdjust;
            var logTxt = " " + attrAdjust;
            if (gm.getValue('AutoStatAdv', false)) {
                //Using eval, so user can define formulas on menu, like energy = level + 50
                attrAdjustNew = eval(attrAdjust);
                logTxt = " (" + attrAdjust + ")=" + attrAdjustNew;
            }

            if (attrAdjustNew > attrCurrent) {
                gm.log("Status Before:  " + lc_attribute + "=" + attrCurrent + " Adjusting To:" + logTxt);
                this.Click(button);
                return "Click";
            }

            return "Next";
        } catch (e) {
            gm.log("ERROR in IncreaseStat: " + e);
            return "Fail";
        }
    },

    AutoStatRuleLog: true,

    AutoStat: function () {
        try {
            if (!gm.getValue('AutoStat')) {
                return false;
            }

            if (!gm.getValue("statsMatch", true)) {
                if (this.AutoStatRuleLog) {
                    gm.log("User should change their stats rules");
                    this.AutoStatRuleLog = false;
                }

                return false;
            }

            var content = document.getElementById('app46755028429_main_bntp');
            if (!content) {
                //gm.log("id:main_bntp not found");
                return false;
            }

            var a = nHtml.FindByAttrContains(content, 'a', 'href', 'keep.php');
            if (!a) {
                //gm.log("a:href:keep.php not found");
                return false;
            }

            this.statsPoints = a.firstChild.firstChild.data.replace(new RegExp("[^0-9]", "g"), '');
            if (!this.statsPoints || this.statsPoints < gm.getValue("SkillPointsNeed", 1)) {
                //gm.log("Dont have enough stats points");
                return false;
            }

            var atributeSlice = nHtml.FindByAttrContains(document.body, "div", "class", 'keep_attribute_section');
            if (!atributeSlice) {
                this.NavigateTo('keep');
                return true;
            }

            for (var n = 1; n <= 5; n += 1) {
                if (gm.getValue('Attribute' + n, '') === '') {
                    //gm.log("Attribute" + n + " is blank: continue");
                    continue;
                }
                if (this.stats.level < 10) {
                    if (gm.getValue('Attribute' + n, '') === 'Attack' || gm.getValue('Attribute' + n, '') === 'Defense') {
                        continue;
                    }
                }

                switch (this.IncreaseStat(gm.getValue('Attribute' + n, ''), gm.getValue('AttrValue' + n, 0), atributeSlice)) {
                case "Next" :
                    //gm.log("Attribute" + n + " : next");
                    continue;
                case "Click" :
                    //gm.log("Attribute" + n + " : click");
                    return true;
                default :
                    //gm.log("Attribute" + n + " unknown return value");
                    return false;
                }
            }

            gm.log("No rules match to increase stats");
            gm.setValue("statsMatch", false);
            return false;
        } catch (e) {
            gm.log("ERROR in AutoStat: " + e);
            return false;
        }
    },

    AutoCollectMA: function () {
        try {
            if (!gm.getValue('AutoCollectMA', true) ||
                !(this.WhileSinceDidIt('AutoCollectMATimer', (24 * 60 * 60) + (5 * 60)))) {
                return false;
            }

            gm.log("Collecting Master and Apprentice reward");
            caap.SetDivContent('idle_mess', 'Collect MA Reward');
            var buttonMas = nHtml.FindByAttrContains(document.body, "img", "src", "ma_view_progress_main");
            var buttonApp = nHtml.FindByAttrContains(document.body, "img", "src", "ma_main_learn_more");
            if (!buttonMas && !buttonApp) {
                gm.log("Going to home");
                if (this.NavigateTo('index')) {
                    return true;
                }
            }

            if (buttonMas) {
                this.Click(buttonMas);
                caap.SetDivContent('idle_mess', 'Collected MA Reward');
                gm.log("Collected Master and Apprentice reward");
            }

            if (!buttonMas && buttonApp) {
                caap.SetDivContent('idle_mess', 'No MA Rewards');
                gm.log("No Master and Apprentice rewards");
            }

            window.setTimeout(function () {
                caap.SetDivContent('idle_mess', '');
            }, 5000);

            this.JustDidIt('AutoCollectMATimer');
            gm.log("Collect Master and Apprentice reward completed");
            return true;
        } catch (e) {
            gm.log("ERROR in AutoCollectMA: " + e);
            return false;
        }
    },

    Idle: function () {
        //Update Monster Finder
        if (caap.WhileSinceDidIt("clearedMonsterFinderLinks", 72 * 60 * 60)) {
            this.clearLinks(true);
        }

        try {
            //if we need to add some army member
            if (gm.getValue('FillArmy', false)) {
                if (!this.CheckForImage('invite_on.gif')) {
                    caap.SetDivContent('idle_mess', 'Filling Army');
                    this.NavigateTo('army');
                } else { //get not army members
                    gm.log("Getting FB friends");
                    var IdsListNotArmyAll = "//div[@class='unselected_list']//label[@class='clearfix']";
                    var results = document.evaluate(IdsListNotArmyAll, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                    var i = 0;
                    IdsListNotArmyAll = [];
                    while (results.snapshotItem(i) !== null) {
                        var res = results.snapshotItem(i);
                        IdsListNotArmyAll[IdsListNotArmyAll.length] = res.firstChild.value;
                        i += 1;
                    }

                    var Ids = [];
                    var counter = 0;
                    if (!gm.getValue('waiting', false)) { //get CA friends
                        gm.log("Getting CA friend's list");
                        gm.setValue('waiting', true);
                        window.setTimeout(function () {
                            gm.deleteValue('waiting');
                        }, 10000);

                        GM_xmlhttpRequest({
                            url: 'http://apps.facebook.com/castle_age/gift.php?app_friends=false&giftSelection=1',
                            method: 'GET',
                            onload: function (response) {
                                var excludeMatch = response.responseText.match(/(exclude_ids=")[\-0-9,]*"/);
                                if (response.status == 200 && excludeMatch) { //if response == ok
                                    gm.deleteValue('waiting');
                                    gm.log(response.statusText);
                                    var IdsList = excludeMatch.toString().replace(new RegExp("[^0-9,]", "g"), '').split(',');
                                    for (var x in IdsListNotArmyAll) { //search for CA friends not in army
                                        if (IdsListNotArmyAll.hasOwnProperty(x)) {
                                            for (var y in IdsList) {
                                                if (IdsList.hasOwnProperty(y)) {
                                                    if (IdsList[y] == IdsListNotArmyAll[x]) {
                                                        Ids[counter += 1] = IdsListNotArmyAll[x];
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    // Add army members //
                                    var count = 0;
                                    var ID = gm.getValue("ArmyCount", 0);
                                    if (ID === 0) {
                                        gm.log("Adding " + Ids.length + " member");
                                    }

                                    caap.SetDivContent('idle_mess', 'Filling Army, Please wait...' + ID + "/" + Ids.length);
                                    for (ID; ID < Ids.length ; ID += 1) {
                                        caap.SetDivContent('idle_mess', 'Filling Army, Please wait...' + ID + "/" + Ids.length);
                                        if (count >= 5) { //don't spam requests
                                            this.waitMilliSecs = 1000;
                                            break;
                                        } else {
                                            count += 1;
                                            GM_xmlhttpRequest({
                                                url: 'http://apps.facebook.com/castle_age/index.php?tp=cht&lka=' + Ids[ID] + '&buf=1',
                                                method: "GET",
                                                onload: function (response) {
                                                    count -= 1;
                                                    if (response.status != 200) {
                                                        GM_log([response.status, response.finalUrl].join("\n"));
                                                    }
                                                }
                                            });

                                            gm.setValue("ArmyCount", ID);
                                        }
                                    }

                                    if (ID >= Ids.length) {
                                        caap.SetDivContent('idle_mess', '<b>Fill Army Completed</b>');
                                        window.setTimeout(function () {
                                            caap.SetDivContent('idle_mess', '');
                                        }, 5000);

                                        gm.log("Fill Army Completed");
                                        gm.setValue('FillArmy', false);
                                        gm.deleteValue("ArmyCount");
                                        gm.deleteValue('waiting');
                                    }
                                } else {//if response != ok
                                    caap.SetDivContent('idle_mess', '<b>Fill Army Failed</b>');
                                    window.setTimeout(function () {
                                        caap.SetDivContent('idle_mess', '');
                                    }, 5000);

                                    gm.log("Fill Army Not Completed, cant get CA friends list");
                                    gm.log("Response.status: " + response.statusText);
                                    gm.setValue('FillArmy', false);
                                    gm.deleteValue("ArmyCount");
                                    gm.deleteValue('waiting');
                                }
                            }
                        });
                    }
                }

                return true;
            }
        } catch (e) {
            gm.log("ERROR in FillArmy: " + e);
            caap.SetDivContent('idle_mess', '<b>Fill Army Failed</b>');
            window.setTimeout(function () {
                caap.SetDivContent('idle_mess', '');
            }, 5000);

            gm.setValue('FillArmy', false);
            gm.deleteValue("ArmyCount");
            gm.deleteValue('waiting');
        }

        this.AutoCollectMA();
        this.ReconPlayers();
        this.UpdateDashboard();
        gm.setValue('ReleaseControl', true);
        return true;
    },

    /*-------------------------------------------------------------------------------------\
                                      RECON PLAYERS
    ReconPlayers is an idle background process that scans the battle page for viable
    targets that can later be attacked.
    \-------------------------------------------------------------------------------------*/
    ReconPlayers: function () {
        try {
    /*-------------------------------------------------------------------------------------\
    If recon is disabled or if we check our timer to make sure we are not running recon too
    often.
    \-------------------------------------------------------------------------------------*/
            if (!gm.getValue('DoPlayerRecon', false)) {
                return false;
            }

            if (this.stats.stamina.num <= 0) {
                return false;
            }

            if (!this.CheckTimer('PlayerReconTimer')) {
                return false;
            }

            this.SetDivContent('idle_mess', 'Player Recon: Starting');
    /*-------------------------------------------------------------------------------------\
    If we don't have our iframe then we open it up. We give an additional 30 seconds to get
    loaded.
    \-------------------------------------------------------------------------------------*/
            if (!document.getElementById("iframeRecon")) {
                nHtml.OpenInIFrame('http://apps.facebook.com/castle_age/battle.php#iframeRecon', 'iframeRecon');
                gm.log('Opening the recon iframe');
                this.SetTimer('PlayerReconTimer', 30);
                return true;
            }
    /*-------------------------------------------------------------------------------------\
    pageObj wil contain our iframe DOM content.  If we don't have any content yet we give
    it another 30 seconds.
    \-------------------------------------------------------------------------------------*/
            var pageObj = document.getElementById("iframeRecon").contentDocument;
            if (!pageObj) {
                gm.log('Recon HTML page not ready. waithing For 30 more secionds.');
                this.SetTimer('PlayerReconTimer', 30);
                return true;
            }

            this.SetDivContent('idle_mess', 'Player Recon: In Progress');
    /*-------------------------------------------------------------------------------------\
    We use the 'invade' button gif for our snapshot.  If we don't find any then we aren't
    in the right place or have a load problem
    \-------------------------------------------------------------------------------------*/
            var target = "//input[contains(@src,'battle_01.gif')]";
            var ss = pageObj.evaluate(target, pageObj, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            if (ss.snapshotLength <= 0) {
                pageObj.location.reload(true);
                gm.log('Recon can not find battle page');
                caap.SetDivContent('idle_mess', '');
                return false;
            }

            //gm.log("Found targets: "+ss.snapshotLength);
    /*-------------------------------------------------------------------------------------\
    Next we get our Recon Player settings for lowest rank, highest level, and army ratio
    base multiplier.
    \-------------------------------------------------------------------------------------*/
            var reconRank = gm.getNumber('ReconPlayerRank', 99);
            var reconLevel = gm.getNumber('ReconPlayerLevel', 999);
            var reconARBase = gm.getNumber('ReconPlayerARBase', 999);
            var found = 0;
    /*-------------------------------------------------------------------------------------\
    Now we step through our snapshot data which represents data within each 'tr' for each
    target on the battle page.  We step back through the parent objects until we have the
    entire 'tr'
    \-------------------------------------------------------------------------------------*/
            for (var s = 0; s < ss.snapshotLength; s += 1) {
                var obj = ss.snapshotItem(s);
                while (obj.tagName.toLowerCase() != "tr") {
                    obj = obj.parentNode;
                }

                var tr = obj;
    /*-------------------------------------------------------------------------------------\
    We get the deity number for the target
    \-------------------------------------------------------------------------------------*/
                var deityNum = this.NumberOnly(this.CheckForImage('symbol_', tr, pageObj).src.match(/\d+\.jpg/i).toString());
    /*-------------------------------------------------------------------------------------\
    We also get the targets actual name, level and rank from the text string
    \-------------------------------------------------------------------------------------*/
                var regex = new RegExp('(.+), Level ([0-9]+)\\s*([A-Za-z ]+)\\s*([0-9]+)', 'i');
                var txt = nHtml.GetText(tr).trim();
                var levelm = regex.exec(txt);
                if (!levelm) {
                    gm.log('Recon can not parse target text string' + txt);
                    continue;
                }

                var nameStr = levelm[1].trim();
                var levelNum = parseInt(levelm[2], 10);
                var rankStr = levelm[3].trim();
                var rankNum = this.rankTable[rankStr.toLowerCase()];
    /*-------------------------------------------------------------------------------------\
    Then we get the targets army count and userid.  We'll also save the current time we
    found the target alive.
    \-------------------------------------------------------------------------------------*/
                var armyNum = parseInt(levelm[4], 10);
                var userID = nHtml.FindByAttrXPath(tr, "input", "@name='target_id'", pageObj).value;
                var aliveTime = (new Date().getTime());
                //gm.log('Player stats: '+userID+' '+nameStr+' '+deityNum+' '+rankStr+' '+rankNum+' '+levelNum+' '+armyNum+' '+aliveTime);
    /*-------------------------------------------------------------------------------------\
    We filter out targets that are above the recon max level or below the recon min rank
    \-------------------------------------------------------------------------------------*/
                if (levelNum - this.stats.level > reconLevel) {
                    continue;
                }

                if (this.stats.rank - rankNum  > reconRank) {
                    continue;
                }
    /*-------------------------------------------------------------------------------------\
    We adjust the army ratio base by our level multiplier and then apply this to our army
    size.  If the result is our adjusted army size is below the targets army size then
    we filter this taregt too.
    \-------------------------------------------------------------------------------------*/
                var levelMultiplier = this.stats.level / levelNum;
                var armyRatio = reconARBase * levelMultiplier;
                if (armyRatio <= 0) {
                    gm.log('Recon unable to calculate army ratio: ' + reconARBase + '/' + levelMultiplier);
                    continue;
                }

                if (armyNum > (this.stats.army * armyRatio)) {
                    continue;
                }
                //gm.log('Target Found: '+userID+' '+nameStr+' '+deityNum+' '+rankStr+' '+rankNum+' '+levelNum+' '+armyNum+' '+aliveTime);
    /*-------------------------------------------------------------------------------------\
    Ok, recon has found a viable target. We get any existing values from the targetsOL
    database.
    \-------------------------------------------------------------------------------------*/
                found += 1;
                var invadewinsNum = gm.getListObjVal('targetsOl', userID, 'invadewinsNum', -1);
                var invadelossesNum = gm.getListObjVal('targetsOl', userID, 'invadelossesNum', -1);
                var duelwinsNum = gm.getListObjVal('targetsOl', userID, 'duelwinsNum', -1);
                var duellossesNum = gm.getListObjVal('targetsOl', userID, 'duellossesNum', -1);
                var defendwinsNum = gm.getListObjVal('targetsOl', userID, 'defendwinsNum', -1);
                var defendlossesNum = gm.getListObjVal('targetsOl', userID, 'defendlossesNum', -1);
                var goldNum = gm.getListObjVal('targetsOl', userID, 'goldNum', -1);
                var attackTime = gm.getListObjVal('targetsOl', userID, 'attackTime', 0);
                var selectTime = gm.getListObjVal('targetsOl', userID, 'selectTime', 0);
                var statswinsNum = gm.getListObjVal('targetsOl', userID, 'statswinsNum', -1);
                var statslossesNum = gm.getListObjVal('targetsOl', userID, 'statswinsNum', -1);
    /*-------------------------------------------------------------------------------------\
    And then we add/update targetsOL database with information on the target. We include
    the max value of the number of entries on the first update
    \-------------------------------------------------------------------------------------*/
                var entryLimit = gm.getValue('LimitTargets', 100);
                gm.setListObjVal('targetsOl', userID, 'nameStr', nameStr, entryLimit);          /* Target name */
                gm.setListObjVal('targetsOl', userID, 'rankStr', rankStr);                     /* Target rank */
                gm.setListObjVal('targetsOl', userID, 'rankNum', rankNum);                     /* Target rank number */
                gm.setListObjVal('targetsOl', userID, 'levelNum', levelNum);                   /* Traget level */
                gm.setListObjVal('targetsOl', userID, 'armyNum', armyNum);                     /* Target army size */
                gm.setListObjVal('targetsOl', userID, 'deityNum', deityNum);                   /* Target deity affiliation number */
                gm.setListObjVal('targetsOl', userID, 'invadewinsNum', invadewinsNum);         /* Tally of invade wins against target */
                gm.setListObjVal('targetsOl', userID, 'invadelossesNum', invadelossesNum);     /* Tally of invade losses against target */
                gm.setListObjVal('targetsOl', userID, 'duelwinsNum', duelwinsNum);             /* Tally of duel wins against target */
                gm.setListObjVal('targetsOl', userID, 'duellossesNum', duellossesNum);         /* Tally of duel losses against target */
                gm.setListObjVal('targetsOl', userID, 'defendwinsNum', defendwinsNum);         /* Tally of wins when target attacked us */
                gm.setListObjVal('targetsOl', userID, 'defendlossesNum', defendlossesNum);     /* Tally of losses when target attacked us */
                gm.setListObjVal('targetsOl', userID, 'statswinsNum', statswinsNum);           /* Targets win count from stats */
                gm.setListObjVal('targetsOl', userID, 'statslossesNum', statslossesNum);       /* Targets loss count from stats */
                gm.setListObjVal('targetsOl', userID, 'goldNum', goldNum);                     /* Tally of gold won from target */
                gm.setListObjVal('targetsOl', userID, 'aliveTime', aliveTime);                 /* Last time found alive */
                gm.setListObjVal('targetsOl', userID, 'attackTime', attackTime);               /* Last time attacked */
                gm.setListObjVal('targetsOl', userID, 'selectTime', selectTime);               /* Last time selected to attack */
            }
    /*-------------------------------------------------------------------------------------\
    We're done with recon.  Reload the battle page for next pass and set timer for the next
    recon to occur in 60 seconds
    \-------------------------------------------------------------------------------------*/
            pageObj.location.reload(true);
            var retrySecs = gm.getValue('PlayerReconRetry', 60);
            this.SetTimer('PlayerReconTimer', retrySecs);
            if (found > 0) {
                this.SetDivContent('idle_mess', 'Player Recon: Found:' + found + ' Total:' + gm.getList('targetsOl').length);
            } else {
                this.SetDivContent('idle_mess', 'Player Recon: No Targets Found');
            }

            window.setTimeout(function () {
                caap.SetDivContent('idle_mess', '');
            }, retrySecs * 1000);

            return false;
        } catch (e) {
            gm.log("ERROR in Recon :" + e);
            return false;
        }
    },

    currentPage: "",

    currentTab: "",

    waitMilliSecs: 5000,

    /////////////////////////////////////////////////////////////////////
    //                          MAIN LOOP
    // This function repeats continously.  In principle, functions should only make one
    // click before returning back here.
    /////////////////////////////////////////////////////////////////////

    actionDescTable: {
        'AutoIncome': 'Awaiting Income',
        'AutoStat': 'Upgrade Skill Points',
        'MaxEnergyQuest': 'At Max Energy Quest',
        'PassiveGeneral': 'Setting Idle General',
        'Idle': 'Idle Tasks',
        'ImmediateBanking': 'Immediate Banking',
        'Battle': 'Battling Players',
        'MonsterReview': 'Review Monsters/Raids',
        'ImmediateAutoStat': 'Immediate Auto Stats',
        'AutoElite': 'Fill Elite Guard',
        'ArenaElite': 'Fill Arena Elite',
        'AutoPotions': 'Auto Potions',
        'AutoAlchemy': 'Auto Alchemy',
        'AutoBless': 'Auto Bless',
        'AutoGift': 'Auto Gifting',
        'MonsterFinder': 'Monster Finder',
        'DemiPoints': 'Demi Points First',
        'Monsters': 'Fighting Monsters',
        'Heal': 'Auto Healing',
        'Bank': 'Auto Banking',
        'Lands': 'Land Operations'
    },

    CheckLastAction: function (thisAction) {
        var lastAction = gm.getValue('LastAction', 'none');
        if (this.actionDescTable[thisAction]) {
            this.SetDivContent('activity_mess', 'Activity: ' + this.actionDescTable[thisAction]);
        } else {
            this.SetDivContent('activity_mess', 'Activity: ' + thisAction);
        }

        if (lastAction != thisAction) {
            gm.log('Changed from doing ' + lastAction + ' to ' + thisAction);
            gm.setValue('LastAction', thisAction);
        }
    },

    // The Master Action List
    masterActionList: {
        0x00: 'AutoElite',
        0x01: 'ArenaElite',
        0x02: 'Heal',
        0x03: 'ImmediateBanking',
        0x04: 'ImmediateAutoStat',
        0x05: 'MaxEnergyQuest',
        0x06: 'DemiPoints',
        0x07: 'MonsterReview',
        0x08: 'Monsters',
        0x09: 'Battle',
        0x0A: 'MonsterFinder',
        0x0B: 'Quests',
        0x0C: 'PassiveGeneral',
        0x0D: 'Lands',
        0x0E: 'Bank',
        0x0F: 'AutoBless',
        0x10: 'AutoStat',
        0x11: 'AutoGift',
        0x12: 'AutoPotions',
        0x13: 'AutoAlchemy',
        0x14: 'Idle'
    },

    actionsList: [],

    MakeActionsList: function () {
        try {
            if (this.actionsList.length === 0) {
                gm.log("Loading a fresh Action List");
                // actionOrder is a comma seperated string of action numbers as
                // hex pairs and can be referenced in the Master Action List
                // Example: "00,01,02,03,04,05,06,07,08,09,0A,0B,0C,0D,0E,0F,10,11,12,13,14"
                var action = '';
                var actionOrderArray = [];
                var masterActionListCount = 0;
                var actionOrderUser = gm.getValue("actionOrder", '');
                if (actionOrderUser !== '') {
                    // We are using the user defined actionOrder set in the
                    // Advanced Hidden Options
                    gm.log("Trying user defined Action Order");
                    // We take the User Action Order and convert it from a comma
                    // separated list into an array
                    actionOrderArray = actionOrderUser.split(",");
                    // We count the number of actions contained in the
                    // Master Action list
                    for (action in this.masterActionList) {
                        if (this.masterActionList.hasOwnProperty(action)) {
                            masterActionListCount += 1;
                            //gm.log("Counting Action List: " + masterActionListCount);
                        } else {
                            gm.log("Error Getting Master Action List length!");
                            gm.log("Skipping 'action' from masterActionList: " + action);
                        }
                    }
                } else {
                    // We are building the Action Order Array from the
                    // Master Action List
                    gm.log("Building the default Action Order");
                    for (action in this.masterActionList) {
                        if (this.masterActionList.hasOwnProperty(action)) {
                            masterActionListCount = actionOrderArray.push(action);
                            //gm.log("Action Added: " + action);
                        } else {
                            gm.log("Error Building Default Action Order!");
                            gm.log("Skipping 'action' from masterActionList: " + action);
                        }
                    }
                }

                // We notify if the number of actions are not sensible or the
                // same as in the Master Action List
                var actionOrderArrayCount = actionOrderArray.length;
                if (actionOrderArrayCount === 0) {
                    var throwError = "Action Order Array is empty! " +
                        actionOrderUser === "" ? "(Default)" : "(User)";
                    throw throwError;
                }

                if (actionOrderArrayCount < masterActionListCount) {
                    gm.log("Warning! Action Order Array has fewer orders than default!");
                }

                if (actionOrderArrayCount > masterActionListCount) {
                    gm.log("Warning! Action Order Array has more orders than default!");
                }

                // We build the Action List
                //gm.log("Building Action List ...");
                for (var itemCount = 0; itemCount !== actionOrderArrayCount; itemCount += 1) {
                    var actionItem = '';
                    if (actionOrderUser !== '') {
                        // We are using the user defined comma separated list
                        // of hex pairs
                        actionItem = this.masterActionList[parseInt(actionOrderArray[itemCount], 16)];
                        //gm.log("(" + itemCount + ") Converted user defined hex pair to action: " + actionItem);
                    } else {
                        // We are using the Master Action List
                        actionItem = this.masterActionList[actionOrderArray[itemCount]];
                        //gm.log("(" + itemCount + ") Converted Master Action List entry to an action: " + actionItem);
                    }

                    // Check the Action Item
                    if (actionItem.length > 0 && typeof(actionItem) === "string") {
                        // We add the Action Item to the Action List
                        this.actionsList.push(actionItem);
                        //gm.log("Added action to the list: " + actionItem);
                    } else {
                        gm.log("Error! Skipping actionItem");
                        gm.log("Action Item(" + itemCount + "): " + actionItem);
                    }
                }

                if (actionOrderUser !== '') {
                    gm.log("Get Action List: " + this.actionsList);
                }
            }
            return true;
        } catch (e) {
            // Something went wrong, log it and use the emergency Action List.
            gm.log("ERROR in MakeActionsList: " + e);
            this.actionsList = [
                "AutoElite",
                "ArenaElite",
                "Heal",
                "ImmediateBanking",
                "ImmediateAutoStat",
                "MaxEnergyQuest",
                "DemiPoints",
                "MonsterReview",
                "Monsters",
                "Battle",
                "MonsterFinder",
                "Quests",
                "PassiveGeneral",
                "Lands",
                "Bank",
                "AutoBless",
                "AutoStat",
                "AutoGift",
                "AutoPotions",
                "AutoAlchemy",
                "Idle"
            ];
            return false;
        }
    },

    MainLoop: function () {
        this.waitMilliSecs = 5000;
        // assorted errors...
        var href = location.href;
        if (href.indexOf('/common/error.html') >= 0) {
            gm.log('detected error page, waiting to go back to previous page.');
            window.setTimeout(function () {
                window.history.go(-1);
            }, 30 * 1000);

            return;
        }

        if (document.getElementById('try_again_button')) {
            gm.log('detected Try Again message, waiting to reload');
            // error
            window.setTimeout(function () {
                window.history.go(0);
            }, 30 * 1000);

            return;
        }

        if (gm.getValue("fbFilter", false) && (window.location.href.indexOf('apps.facebook.com/reqs.php') >= 0 || window.location.href.indexOf('apps.facebook.com/home.php') >= 0 ||  window.location.href.indexOf('filter=app_46755028429') >= 0)) {
            var css = "#contentArea div[id^=\"div_story_\"]:not([class*=\"46755028429\"]) {\ndisplay:none !important;\n}";
            if (typeof GM_addStyle != "undefined") {
                GM_addStyle(css);
            }
        }

        var locationFBMF = false;
        if (global.is_chrome) {
            if (window.location.href.indexOf('apps.facebook.com/reqs.php') >= 0 || window.location.href.indexOf('apps.facebook.com/home.php') >= 0 ||  window.location.href.indexOf('filter=app_46755028429') >= 0) {
                locationFBMF = true;
            }
        } else {
            if (window.location.href.indexOf('www.facebook.com/reqs.php') >= 0 || window.location.href.indexOf('www.facebook.com/home.php') >= 0 ||  window.location.href.indexOf('filter=app_46755028429') >= 0) {
                locationFBMF = true;
            }
        }

        if (locationFBMF) {
            if (gm.getValue("mfStatus", "") == "OpenMonster") {
                gm.log("Opening Monster " + gm.getValue("navLink"));
                this.CheckMonster();
            } else if (gm.getValue("mfStatus", "") == "CheckMonster") {
                gm.log("Scanning URL for new monster");
                this.selectMonst();
            }

            this.MonsterFinderOnFB();
            this.AcceptGiftOnFB();
            this.WaitMainLoop();
            return;
        }

        //We don't need to send out any notifications
        var button = nHtml.FindByAttrContains(document.body, "a", "class", 'undo_link');
        if (button) {
            this.Click(button);
            gm.log('Undoing notification');
        }

        var caapDisabled = gm.getValue('Disabled', false);
        if (caapDisabled) {
            if (global.is_chrome) {
                CE_message("disabled", null, caapDisabled);
            }

            this.WaitMainLoop();
            return;
        }

        if (!this.GetStats()) {
            var noWindowLoad = gm.getValue('NoWindowLoad', 0);
            if (noWindowLoad === 0) {
                this.JustDidIt('NoWindowLoadTimer');
                gm.setValue('NoWindowLoad', 1);
            } else if (this.WhileSinceDidIt('NoWindowLoadTimer', Math.min(Math.pow(2, noWindowLoad - 1) * 15, 60 * 60))) {
                this.JustDidIt('NoWindowLoadTimer');
                gm.setValue('NoWindowLoad', noWindowLoad + 1);
                this.ReloadCastleAge();
            }

            gm.log('Page no-load count: ' + noWindowLoad);
            this.WaitMainLoop();
            return;
        } else {
            gm.setValue('NoWindowLoad', 0);
        }

        if (gm.getValue('caapPause', 'none') != 'none') {
            var div = document.getElementById("caap_div");
            document.getElementById("caap_div").style.background = gm.getValue('StyleBackgroundDark', '#fee');
            document.getElementById("caap_div").style.opacity = div.style.transparency = gm.getValue('StyleOpacityDark', '1');
            this.WaitMainLoop();
            return;
        }

        if (this.WhileSinceDidIt('clickedOnSomething', 25) && this.waitingForDomLoad) {
            gm.log('Clicked on something, but nothing new loaded.  Reloading page.');
            this.ReloadCastleAge();
        }

        if (this.AutoIncome()) {
            this.CheckLastAction('AutoIncome');
            this.WaitMainLoop();
            return;
        }

        this.MakeActionsList();
        var actionsListCopy = this.actionsList.slice();

        //gm.log("Action List: " + actionsListCopy);
        if (!gm.getValue('ReleaseControl', false)) {
            actionsListCopy.unshift(gm.getValue('LastAction', 'Idle'));
        } else {
            gm.setValue('ReleaseControl', false);
        }

        //gm.log('Action List2: ' + actionsListCopy);
        for (var action in actionsListCopy) {
            if (actionsListCopy.hasOwnProperty(action)) {
                //gm.log('Action: ' + actionsListCopy[action]);
                if (this[actionsListCopy[action]]()) {
                    this.CheckLastAction(actionsListCopy[action]);
                    break;
                }
            }
        }

        this.WaitMainLoop();
    },

    WaitMainLoop: function () {
        this.waitForPageChange = true;
        nHtml.setTimeout(function () {
            this.waitForPageChange = false;
            caap.MainLoop();
        }, caap.waitMilliSecs * (1 + Math.random() * 0.2));
    },

    ReloadCastleAge: function () {
        // better than reload... no prompt on forms!
        if (window.location.href.indexOf('castle_age') >= 0 && !gm.getValue('Disabled') &&
                (gm.getValue('caapPause') == 'none')) {
            if (global.is_chrome) {
                CE_message("paused", null, gm.getValue('caapPause', 'none'));
            }

            window.location = "http://apps.facebook.com/castle_age/index.php?bm=1";
        }
    },

    ReloadOccasionally: function () {
        var reloadMin = gm.getNumber('ReloadFrequency', 8);
        if (!reloadMin || reloadMin < 8) {
            reloadMin = 8;
        }

        nHtml.setTimeout(function () {
            if (caap.WhileSinceDidIt('clickedOnSomething', 5 * 60)) {
                gm.log('Reloading if not paused after inactivity');
                if (window.location.href.indexOf('castle_age') >= 0 &&
                        !gm.getValue('Disabled') &&
                        (gm.getValue('caapPause') == 'none')) {
                    if (global.is_chrome) {
                        CE_message("paused", null, gm.getValue('caapPause', 'none'));
                    }

                    window.location = "http://apps.facebook.com/castle_age/index.php?bm=1";
                }
            }

            caap.ReloadOccasionally();
        }, 1000 * 60 * reloadMin + (reloadMin * 60 * 1000 * Math.random()));
    }
};
