
var setupController = function(params) {

    var SENSORS_DELAY = 10000;

    var headerMap = [];
    headerMap['ID'] = {name: "", title: "", align: "", width: "", visibility: false};
    headerMap['ModuleID'] = {name: "", title: "", align: "", width: "", visibility: false};
    headerMap['ModuleName'] = {name: "Модуль", title: "", align: "", width: "", visibility: false};
    headerMap['MAC'] = {name: "", title: "", align: "", width: "", visibility: true};
    headerMap['IP'] = {name: "", title: "", align: "", width: "", visibility: true};
    headerMap['Description'] = {name: "Описание", title: "", align: "", width: "", visibility: true};
    headerMap['SensorDelay'] = {name: "Период опроса, сек", title: "", align: "", width: "", visibility: true};
    headerMap['LastSeenDateTime'] = {name: "Обновление", title: "", align: "", width: "", visibility: true};
    headerMap['IsActive'] = {name: "", title: "", align: "", width: "", visibility: false};

    function requestModulesData() {
        queryHelper.requestModuleData({ sortBy: "ModuleName" }, renderModulesData);
    }

    function renderModulesData(moduleData) {

        var fields = moduleData.fields;
        var modules = moduleData.data;

        for (var i = 0; i < modules.length; i++) {
            modules[i].LastSeenDateTime = new Date(modules[i].LastSeenDateTime);
        }

        var container = ge("pageContainer");
        var row = document.createElement("div");
        row.className = "row";
        container.appendChild(row);

        for (i = 0; i < modules.length; i++) {
            renderModule(row, fields, modules[i]);
        }

        window.setInterval(onTimer, SENSORS_DELAY);
    }

    function getModuleStatus(module) {
        var isActive = module.IsActive !== 0;
        var lastSeenDateTime = module.LastSeenDateTime;
        var diff = Math.abs(new Date() - lastSeenDateTime);
        var delay = module.SensorDelay * 1000; //in ms
        var isOn = diff < delay * 2;
        var status = isActive ? (isOn ? "В сети" : "Не в сети") : "Выключен";
        var className = isOn ? "success" : "danger";
        var buttonClass = isOn ? "btn" : "btn disabled";

        var headerId = "{0}_header".format(module.MAC);
        var widgetId = "{0}_widget".format(module.MAC);
        var btnStatusId = "{0}_btnStatus".format(module.MAC);
        var btnSetupId = "{0}_btnSetup".format(module.MAC);

        return {
            name: module.ModuleName,
            moduleId: module.ModuleID,
            status: status,
            className: className,
            isOn: isOn,
            headerId: headerId,
            buttonClass: buttonClass,
            btnStatusId: btnStatusId,
            btnSetupId: btnSetupId,
            widgetId: widgetId
        };
    }

    function getModuleTitle(status) {
        return "{0} (#{1})&nbsp;&nbsp;<span class='label label-{3}'>{2}</span>".format(status.name, status.moduleId, status.status, status.className);
    }

    function renderModule(row, fields, module) {

        var status = getModuleStatus(module);

        var col = document.createElement("div");
        col.id = status.widgetId;
        col.className = "col-sm-6 col-md-4 moduleWidget";
        if (!status.isOn) {
            col.classList.add("inactiveModuleWidget");
        }
        row.appendChild(col);

        var thumbnail = document.createElement("div");
        thumbnail.className = "thumbnail";
        col.appendChild(thumbnail);

        var caption = document.createElement("div");
        caption.className = "caption";
        thumbnail.appendChild(caption);

        var header = document.createElement("h3");
        header.id = status.headerId;
        header.innerHTML = getModuleTitle(status);
        caption.appendChild(header);

        var hr = document.createElement("hr");
        caption.appendChild(hr);

        renderModuleFields(caption, fields, module);

        hr = document.createElement("hr");
        caption.appendChild(hr);

        var p = document.createElement("p");
        var href = "http://{0}".format(module.IP);

        p.innerHTML = "<a href='" + href + "' target='_blank' id='" + status.btnStatusId + "' class='" + status.buttonClass + " btn-default' role='button'>Состояние</a> " +
            "<a href='" + href + "/setup' target='_blank' id='" + status.btnSetupId + "' class='" + status.buttonClass + " btn-primary' role='button'>Настройка</a>";
        caption.appendChild(p);
    }

    function getHeaderByName(name) {
        return headerMap[name];
    }

    function getModuleParam(module, param) {
        var text = module[param];
        if (isStringEmpty(text))
            return "&ndash;";
        return text;
    }

    function getParamValue(fieldName, value) {
        if (fieldName == "LastSeenDateTime")
            return DateFormat.format.date(value, "HH:mm:ss dd/MM/yyyy");

        return value;
    }

    function getModuleParamMap(header, field, module) {
        var paramName = (!header || isStringEmpty(header.name)) ? field.name : header.name;
        var paramValue = getParamValue(field.name, getModuleParam(module, field.name));
        var paramId = "{0}_{1}".format(module.MAC, field.name);

        return {name: paramName, value: paramValue, id: paramId};
    }

    function renderModuleFields(container, fields, module) {

        var fieldsContainer = document.createElement("div");
        fieldsContainer.className = "fieldsContainer";
        container.appendChild(fieldsContainer);

        for (var i = 0; i < fields.length; i++) {
            var field = fields[i];

            var header = getHeaderByName(field.name);
            if (header && !header.visibility)
                continue;

            var row = document.createElement("h4");
            var paramMap = getModuleParamMap(header, field, module);
            row.innerHTML = "{0}: <span class='label label-default floatRight' id='{2}'>{1}</span>".format(paramMap.name, paramMap.value, paramMap.id);
            fieldsContainer.appendChild(row);
        }
    }

    function onTimer() {
        queryHelper.requestModuleData({}, updateModulesData);
    }

    function updateModulesData(moduleData) {

        var fields = moduleData.fields;
        var modules = moduleData.data;

        for (var i = 0; i < modules.length; i++) {
            modules[i].LastSeenDateTime = new Date(modules[i].LastSeenDateTime);
        }

        for (i = 0; i < modules.length; i++) {
            updateModule(fields, modules[i]);
        }
    }

    function updateModule(fields, module) {

        var status = getModuleStatus(module);

        var col = ge(status.widgetId);
        if (status.isOn) {
            col.classList.remove("inactiveModuleWidget");
        } else {
            col.classList.add("inactiveModuleWidget");
        }

        var header = ge(status.headerId);
        header.innerHTML = getModuleTitle(status);

        var btnStatus = ge(status.btnStatusId);
        btnStatus.className = status.buttonClass + " btn-default";
        var btnSetup = ge(status.btnSetupId);
        btnSetup.className = status.buttonClass + " btn-primary";

        updateModuleFields(fields, module);
    }

    function updateModuleFields(fields, module) {
        for (var i = 0; i < fields.length; i++) {
            var field = fields[i];

            var header = getHeaderByName(field.name);
            if (header && !header.visibility)
                continue;

            var paramMap = getModuleParamMap(header, field, module);
            var label = ge(paramMap.id);
            if (label.innerHTML != paramMap.value)
                label.innerHTML = paramMap.value;
        }
    }

    function init() {
        requestModulesData();
    }

    init();
};
