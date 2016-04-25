
Date.prototype.addHours = function(h) {
    this.setTime(this.getTime() + (h * 60 * 60 * 1000));
    return this;
};

var chartsController = function(params) {

    var interval = "1 HOUR";
    var queryType = "chart";
    var modules = [];
    var activeModuleMac = "";
    var utcDateTimes = [];

    var sensors = [];
    var weatherData = [];

    function getQueryParams() {
        return {
            interval: interval,
            queryType: queryType
        };
    }

    function requestModulesData() {
        queryHelper.requestModuleData({ sortBy: "ModuleName" }, renderModulesData);
    }

    function renderModulesData(moduleData) {
        modules = moduleData.data;

        if (modules.length > 0) {
            activeModuleMac = modules[0].MAC;
        }

        renderModules();
        requestSensorsData();
    }

    function getModuleDescription(mac) {
        for (var i = 0; i < modules.length; i++) {
            var module = modules[i];
            if (module.MAC == mac) {
                return "Модуль: {0}".format(module.Description);
            }
        }

        return "Нет модулей для отображения";
    }

    function updateActiveModuleName(moduleSpan) {
        moduleSpan.innerHTML = getModuleDescription(activeModuleMac);
        if (modules.length == 0) {
            moduleSpan.classList.add("jq-dropdown-disabled");
        } else {
            moduleSpan.classList.remove("jq-dropdown-disabled");
        }
    }

    function renderModuleController() {
        var moduleController = ge("moduleController");
        var moduleSpan = document.createElement("span");
        moduleSpan.id = "moduleSpan";
        moduleController.appendChild(moduleSpan);

        moduleSpan.id = "moduleSpan";
        moduleSpan.className = "example";
        moduleSpan.setAttribute("data-jq-dropdown", "#jq-dropdown-1");

        updateActiveModuleName(moduleSpan);
    }

    function renderModules() {
        var container = ge("modulesMenu");
        var moduleSpan = ge("moduleSpan");

        updateActiveModuleName(moduleSpan);

        for (var i = 0; i < modules.length; i++) {
            var module = modules[i];

            var li = document.createElement("li");
            container.appendChild(li);

            li.innerHTML = "<a class='moduleItem'>{0}</a>".format(module.Description);
            li.title = "{0} ({1})".format(module.ModuleName, module.ModuleID);
            li.setAttribute("mac", module.MAC);

            li.onclick = function() {
                var mac = this.getAttribute("mac");
                if (activeModuleMac != mac)
                {
                    activeModuleMac = mac;
                    updateActiveModuleName(moduleSpan);
                    requestChartData();
                }
            };
        }
    }

    function requestChartData() {
        queryHelper.requestWeatherData(getQueryParams(), renderWeatherData);
    }

    function prepareData(columnName) {
        var columnData = [];

        for (var i = 0; i < weatherData.length; i++) {
            var dt = utcDateTimes[i];
            var value = weatherData[i][columnName];
            if (value != null)
                columnData.push([dt, value]);
        }

        return columnData;
    }

    function prepareUtcDateTimes(dateColumnName) {
        utcDateTimes = [];

        var now = new Date();
        var currentTimeZoneOffsetInHours = now.getTimezoneOffset() / 60;

        for (var i = 0; i < weatherData.length; i++) {
            var dt = weatherData[i][dateColumnName];
            var localdt = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), dt.getHours(), dt.getMinutes(), dt.getSeconds());
            localdt = localdt.addHours(-currentTimeZoneOffsetInHours);
            var utcDatetime = Date.UTC(localdt.getUTCFullYear(), localdt.getUTCMonth(), localdt.getUTCDate(), localdt.getUTCHours(), localdt.getUTCMinutes(), localdt.getUTCSeconds());
            utcDateTimes.push(utcDatetime);
        }
    }

    function renderWeatherData(payload) {
        weatherData = payload.data;
        for (var i = 0; i < weatherData.length; i++) {
            weatherData[i].MeasuredDateTime = new Date(weatherData[i].MeasuredDateTime);
        }

        prepareUtcDateTimes("MeasuredDateTime");

        renderWeatherCharts();
    }

    function getIntervalDescription(interval) {
        var intervalAnchors = $(".intervalItem");
        for (var i = 0; i < intervalAnchors.length; i++) {
            var a = intervalAnchors[i];
            if (a.getAttribute("data-interval") == interval)
                return a.innerHTML;
        }

        return "";
    }

    function renderChartController() {
        var chartController = ge("chartController");
        var intervalSpan = document.createElement("span");
        chartController.appendChild(intervalSpan);

        intervalSpan.id = "intervalSpan";
        intervalSpan.className = "example";
        intervalSpan.innerHTML = "Показывать график за {0}".format(getIntervalDescription(interval));
        intervalSpan.setAttribute("data-jq-dropdown", "#jq-dropdown-2");

        var intervalAnchors = $(".intervalItem");
        intervalAnchors.bind("click", function() {
            var intervalToSet = this.getAttribute("data-interval");
            if (intervalToSet != interval) {
                interval = intervalToSet;
                intervalSpan.innerHTML = "Показывать график за {0}".format(getIntervalDescription(interval));
                requestChartData();
            }
        });
    }

    function requestSensorsData() {
        queryHelper.requestSensorData({}, renderSensorsData);
    }

    function renderWeatherCharts() {
        for (var i = 0; i < sensors.length; i++) {
            renderSensorChart(sensors[i]);
        }
    }

    function initHighchartsObject(sensor) {
        var chartData = prepareData(sensor.SensorName);
        var chartContainer = ge("chartContainer_{0}".format(sensor.SensorName));
        var sensorChart = $(chartContainer).highcharts({
            chart: {
                backgroundColor: '#3D3F48',
                type: 'line'
            },
            title: {
                text: isStringEmpty(sensor.Description) ? sensor.SensorName : sensor.Description,
                style: { color: "#c0c4c8" }
            },
            xAxis: {
                type: 'datetime',
                gridLineWidth: 1,
                gridLineColor: '#484c5a',
                tickColor: "#484c5a",
                labels: {
                    style: { color: "#c0c4c8" }
                }
            },
            yAxis: [{
                title: {
                    text: sensor.ChartTitle,
                    style: { color: "#c0c4c8" }
                },
                gridLineWidth: 1,
                gridLineColor: '#484c5a',
                labels: {
                    style: { color: "#c0c4c8" }
                }
            }],
            tooltip: {
                valueSuffix: " " + sensor.Units
            },
            legend: {
                enabled: false
            },
            plotOptions: {
                series: {
                    marker: {
                        radius: 0
                    }
                }
            },
            series: [{
                yAxis: 0,
                data: chartData,
                color: "#F6A821"
            }]
        });
    }

    function renderSensorChart(sensor) {
        var widget = ge("sensorWidget_{0}".format(sensor.SensorName));
        var showChart = sensor.ChartVisibility === 1;
        widget.style.display = showChart ? "" : "none";

        if (showChart) {
            initHighchartsObject(sensor);
        }
    }

    function renderSensorChartContainer(chartsContainer, sensor) {
        var col = document.createElement("div");
        col.className = "col-sm-6 col-md-4 sensorWidget";
        col.id = "sensorWidget_{0}".format(sensor.SensorName);
        col.style.display = "none";
        chartsContainer.appendChild(col);

        var thumbnail = document.createElement("div");
        thumbnail.className = "thumbnail";
        col.appendChild(thumbnail);

        var caption = document.createElement("div");
        caption.className = "caption";
        thumbnail.appendChild(caption);

        var chartContainer = document.createElement("div");
        chartContainer.className = "chartContainer";
        chartContainer.id = "chartContainer_{0}".format(sensor.SensorName);
        caption.appendChild(chartContainer);
    }

    function renderSensorsData(sensorsData) {
        // save received data
        sensors = sensorsData.data;

        var sensorsList = ge("sensorsList");
        sensorsList.innerHTML = "";
        var chartsContainer = ge("chartsContainer");
        chartsContainer.innerHTML = "";

        for (var i = 0; i < sensors.length; i++) {
            // render dropdown item
            renderSensor(sensorsList, sensors[i]);
            // render chart thumb
            renderSensorChartContainer(chartsContainer, sensors[i]);
        }

        requestChartData();
    }

    function sensorDataUpdated(sensorsData) {

        var oldSensorsState = [];
        for (var i = 0; i < sensors.length; i++) {
            oldSensorsState.push(sensors[i]);
        }

        sensors = sensorsData.data;

        for (i = 0; i < sensors.length; i++) {
            var sensor = sensors[i];
            if (sensor.ChartVisibility != oldSensorsState[i].ChartVisibility)
                renderSensorChart(sensor);
        }
    }

    function renderSensor(sensorsList, sensor) {

        var cbParent = document.createElement("div");
        cbParent.className = "checkbox checkbox-warning";
        sensorsList.appendChild(cbParent);

        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "styled";
        cb.checked = sensor.ChartVisibility == 1;
        cb.setAttribute("sensorid", sensor.ID);
        cb.id = "cb_{0}".format(sensor.ID);
        cb.onclick = function() {
            var sensorId = parseInt(this.getAttribute("sensorid"));
            queryHelper.updateSensorData({
                id: sensorId,
                chartVisibility: this.checked ? 1 : 0
            }, sensorDataUpdated);
        };
        cbParent.appendChild(cb);

        var label = document.createElement("label");
        label.innerHTML = sensor.Description;
        label.htmlFor = cb.id;
        cbParent.appendChild(label);
    }

    function init() {
        renderModuleController();
        renderChartController();
        requestModulesData();
    }

    init();
};
