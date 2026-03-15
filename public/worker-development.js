/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./worker/index.ts":
/*!*************************!*\
  !*** ./worker/index.ts ***!
  \*************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\n/// <reference lib=\"webworker\" />\n// 1. Этот экспорт нужен, чтобы TS считал файл модулем и не ругался на глобальную область видимости\n// 3. Слушаем событие PUSH\nself.addEventListener(\"push\", (event)=>{\n    // Если данных нет, ничего не делаем\n    if (!event.data) return;\n    try {\n        const data = event.data.json();\n        const title = data.title || \"Daily Astro\";\n        const body = data.body || \"Ваш прогноз готов\";\n        const icon = \"/icons/icon-192.png\"; // Убедитесь, что путь верный (из public)\n        const url = data.url || \"/forecast\";\n        const options = {\n            body,\n            icon,\n            badge: \"/icons/icon-72.png\",\n            data: {\n                url\n            },\n            //@ts-ignore\n            vibrate: [\n                100,\n                200,\n                100,\n                1000,\n                100,\n                200,\n                100\n            ],\n            tag: \"daily-astro-forecast\",\n            renotify: true\n        };\n        event.waitUntil(self.registration.showNotification(title, options));\n    } catch (err) {\n        console.error(\"Error processing push event:\", err);\n    }\n});\n// 4. Слушаем клик по уведомлению\nself.addEventListener(\"notificationclick\", (event)=>{\n    var _event_notification_data;\n    event.notification.close(); // Закрываем уведомление\n    const urlToOpen = ((_event_notification_data = event.notification.data) === null || _event_notification_data === void 0 ? void 0 : _event_notification_data.url) || \"/\";\n    event.waitUntil(self.clients.matchAll({\n        type: \"window\",\n        includeUncontrolled: true\n    }).then((clientList)=>{\n        // 1. Ищем уже открытую вкладку с нашим приложением\n        for (const client of clientList){\n            // Если вкладка открыта и это (примерно) наш URL\n            if (client.url && \"focus\" in client) {\n                return client.focus(); // Просто фокусируемся на ней\n            }\n        }\n        // 2. Если открытой вкладки нет, открываем новую\n        if (self.clients.openWindow) {\n            return self.clients.openWindow(urlToOpen);\n        }\n    }));\n});\n\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                /* unsupported import.meta.webpackHot */ undefined.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi93b3JrZXIvaW5kZXgudHMiLCJtYXBwaW5ncyI6IjtBQUFBLGlDQUFpQztBQUVqQyxtR0FBbUc7QUFNbkcsMEJBQTBCO0FBQzFCQSxLQUFLQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUNDO0lBQzdCLG9DQUFvQztJQUNwQyxJQUFJLENBQUNBLE1BQU1DLElBQUksRUFBRTtJQUVqQixJQUFJO1FBQ0YsTUFBTUEsT0FBT0QsTUFBTUMsSUFBSSxDQUFDQyxJQUFJO1FBRTVCLE1BQU1DLFFBQVFGLEtBQUtFLEtBQUssSUFBSTtRQUM1QixNQUFNQyxPQUFPSCxLQUFLRyxJQUFJLElBQUk7UUFDMUIsTUFBTUMsT0FBTyx1QkFBdUIseUNBQXlDO1FBQzdFLE1BQU1DLE1BQU1MLEtBQUtLLEdBQUcsSUFBSTtRQUV4QixNQUFNQyxVQUErQjtZQUNuQ0g7WUFDQUM7WUFDQUcsT0FBTztZQUNQUCxNQUFNO2dCQUFFSztZQUFJO1lBQ1osWUFBWTtZQUNaRyxTQUFTO2dCQUFDO2dCQUFLO2dCQUFLO2dCQUFLO2dCQUFNO2dCQUFLO2dCQUFLO2FBQUk7WUFDN0NDLEtBQUs7WUFDTEMsVUFBVTtRQUNaO1FBRUFYLE1BQU1ZLFNBQVMsQ0FBQ2QsS0FBS2UsWUFBWSxDQUFDQyxnQkFBZ0IsQ0FBQ1gsT0FBT0k7SUFDNUQsRUFBRSxPQUFPUSxLQUFLO1FBQ1pDLFFBQVFDLEtBQUssQ0FBQyxnQ0FBZ0NGO0lBQ2hEO0FBQ0Y7QUFFQSxpQ0FBaUM7QUFDakNqQixLQUFLQyxnQkFBZ0IsQ0FBQyxxQkFBcUIsQ0FBQ0M7UUFHeEJBO0lBRmxCQSxNQUFNa0IsWUFBWSxDQUFDQyxLQUFLLElBQUksd0JBQXdCO0lBRXBELE1BQU1DLFlBQVlwQixFQUFBQSwyQkFBQUEsTUFBTWtCLFlBQVksQ0FBQ2pCLElBQUksY0FBdkJELCtDQUFBQSx5QkFBeUJNLEdBQUcsS0FBSTtJQUVsRE4sTUFBTVksU0FBUyxDQUNiZCxLQUFLdUIsT0FBTyxDQUNUQyxRQUFRLENBQUM7UUFDUkMsTUFBTTtRQUNOQyxxQkFBcUI7SUFDdkIsR0FDQ0MsSUFBSSxDQUFDLENBQUNDO1FBQ0wsbURBQW1EO1FBQ25ELEtBQUssTUFBTUMsVUFBVUQsV0FBWTtZQUMvQixnREFBZ0Q7WUFDaEQsSUFBSUMsT0FBT3JCLEdBQUcsSUFBSSxXQUFXcUIsUUFBUTtnQkFDbkMsT0FBT0EsT0FBT0MsS0FBSyxJQUFJLDZCQUE2QjtZQUN0RDtRQUNGO1FBRUEsZ0RBQWdEO1FBQ2hELElBQUk5QixLQUFLdUIsT0FBTyxDQUFDUSxVQUFVLEVBQUU7WUFDM0IsT0FBTy9CLEtBQUt1QixPQUFPLENBQUNRLFVBQVUsQ0FBQ1Q7UUFDakM7SUFDRjtBQUVOO0FBOURlIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXEFkbWluXFxEb2N1bWVudHNcXHByb2plY3RzXFxqYXZhX3NjcmlwdFxcZGFpbHktYXN0cm9cXHdvcmtlclxcaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgbGliPVwid2Vid29ya2VyXCIgLz5cclxuXHJcbi8vIDEuINCt0YLQvtGCINGN0LrRgdC/0L7RgNGCINC90YPQttC10L0sINGH0YLQvtCx0YsgVFMg0YHRh9C40YLQsNC7INGE0LDQudC7INC80L7QtNGD0LvQtdC8INC4INC90LUg0YDRg9Cz0LDQu9GB0Y8g0L3QsCDQs9C70L7QsdCw0LvRjNC90YPRjiDQvtCx0LvQsNGB0YLRjCDQstC40LTQuNC80L7RgdGC0LhcclxuZXhwb3J0IHR5cGUge307XHJcblxyXG4vLyAyLiDQntCx0YrRj9Cy0LvRj9C10Lwg0YLQuNC/0Ysg0LTQu9GPIHNlbGZcclxuZGVjbGFyZSBjb25zdCBzZWxmOiBTZXJ2aWNlV29ya2VyR2xvYmFsU2NvcGU7XHJcblxyXG4vLyAzLiDQodC70YPRiNCw0LXQvCDRgdC+0LHRi9GC0LjQtSBQVVNIXHJcbnNlbGYuYWRkRXZlbnRMaXN0ZW5lcihcInB1c2hcIiwgKGV2ZW50KSA9PiB7XHJcbiAgLy8g0JXRgdC70Lgg0LTQsNC90L3Ri9GFINC90LXRgiwg0L3QuNGH0LXQs9C+INC90LUg0LTQtdC70LDQtdC8XHJcbiAgaWYgKCFldmVudC5kYXRhKSByZXR1cm47XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBkYXRhID0gZXZlbnQuZGF0YS5qc29uKCk7XHJcblxyXG4gICAgY29uc3QgdGl0bGUgPSBkYXRhLnRpdGxlIHx8IFwiRGFpbHkgQXN0cm9cIjtcclxuICAgIGNvbnN0IGJvZHkgPSBkYXRhLmJvZHkgfHwgXCLQktCw0Ygg0L/RgNC+0LPQvdC+0Lcg0LPQvtGC0L7QslwiO1xyXG4gICAgY29uc3QgaWNvbiA9IFwiL2ljb25zL2ljb24tMTkyLnBuZ1wiOyAvLyDQo9Cx0LXQtNC40YLQtdGB0YwsINGH0YLQviDQv9GD0YLRjCDQstC10YDQvdGL0LkgKNC40LcgcHVibGljKVxyXG4gICAgY29uc3QgdXJsID0gZGF0YS51cmwgfHwgXCIvZm9yZWNhc3RcIjtcclxuXHJcbiAgICBjb25zdCBvcHRpb25zOiBOb3RpZmljYXRpb25PcHRpb25zID0ge1xyXG4gICAgICBib2R5LFxyXG4gICAgICBpY29uLFxyXG4gICAgICBiYWRnZTogXCIvaWNvbnMvaWNvbi03Mi5wbmdcIiwgLy8g0JjQutC+0L3QutCwINC00LvRjyDRgdGC0LDRgtGD0YEt0LHQsNGA0LAgQW5kcm9pZCAo0LHQtdC70LDRjyDRgSDQv9GA0L7Qt9GA0LDRh9C90L7RgdGC0YzRjilcclxuICAgICAgZGF0YTogeyB1cmwgfSwgLy8g0KHQvtGF0YDQsNC90Y/QtdC8IFVSTCwg0YfRgtC+0LHRiyDQvtGC0LrRgNGL0YLRjCDQtdCz0L4g0L/QviDQutC70LjQutGDXHJcbiAgICAgIC8vQHRzLWlnbm9yZVxyXG4gICAgICB2aWJyYXRlOiBbMTAwLCAyMDAsIDEwMCwgMTAwMCwgMTAwLCAyMDAsIDEwMF0sXHJcbiAgICAgIHRhZzogXCJkYWlseS1hc3Ryby1mb3JlY2FzdFwiLCAvLyDQp9GC0L7QsdGLINC90L7QstGL0LUg0YPQstC10LTQvtC80LvQtdC90LjRjyDQt9Cw0LzQtdC90Y/Qu9C4INGB0YLQsNGA0YvQtSwg0LAg0L3QtSDQutC+0L/QuNC70LjRgdGMXHJcbiAgICAgIHJlbm90aWZ5OiB0cnVlLCAvLyDQktC40LHRgNCw0YbQuNGPINC00LDQttC1INC10YHQu9C4INC30LDQvNC10L3Rj9C10Lwg0YHRgtCw0YDQvtC1INGD0LLQtdC00L7QvNC70LXQvdC40LVcclxuICAgIH07XHJcblxyXG4gICAgZXZlbnQud2FpdFVudGlsKHNlbGYucmVnaXN0cmF0aW9uLnNob3dOb3RpZmljYXRpb24odGl0bGUsIG9wdGlvbnMpKTtcclxuICB9IGNhdGNoIChlcnIpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBwcm9jZXNzaW5nIHB1c2ggZXZlbnQ6XCIsIGVycik7XHJcbiAgfVxyXG59KTtcclxuXHJcbi8vIDQuINCh0LvRg9GI0LDQtdC8INC60LvQuNC6INC/0L4g0YPQstC10LTQvtC80LvQtdC90LjRjlxyXG5zZWxmLmFkZEV2ZW50TGlzdGVuZXIoXCJub3RpZmljYXRpb25jbGlja1wiLCAoZXZlbnQpID0+IHtcclxuICBldmVudC5ub3RpZmljYXRpb24uY2xvc2UoKTsgLy8g0JfQsNC60YDRi9Cy0LDQtdC8INGD0LLQtdC00L7QvNC70LXQvdC40LVcclxuXHJcbiAgY29uc3QgdXJsVG9PcGVuID0gZXZlbnQubm90aWZpY2F0aW9uLmRhdGE/LnVybCB8fCBcIi9cIjtcclxuXHJcbiAgZXZlbnQud2FpdFVudGlsKFxyXG4gICAgc2VsZi5jbGllbnRzXHJcbiAgICAgIC5tYXRjaEFsbCh7XHJcbiAgICAgICAgdHlwZTogXCJ3aW5kb3dcIixcclxuICAgICAgICBpbmNsdWRlVW5jb250cm9sbGVkOiB0cnVlLFxyXG4gICAgICB9KVxyXG4gICAgICAudGhlbigoY2xpZW50TGlzdCkgPT4ge1xyXG4gICAgICAgIC8vIDEuINCY0YnQtdC8INGD0LbQtSDQvtGC0LrRgNGL0YLRg9GOINCy0LrQu9Cw0LTQutGDINGBINC90LDRiNC40Lwg0L/RgNC40LvQvtC20LXQvdC40LXQvFxyXG4gICAgICAgIGZvciAoY29uc3QgY2xpZW50IG9mIGNsaWVudExpc3QpIHtcclxuICAgICAgICAgIC8vINCV0YHQu9C4INCy0LrQu9Cw0LTQutCwINC+0YLQutGA0YvRgtCwINC4INGN0YLQviAo0L/RgNC40LzQtdGA0L3Qvikg0L3QsNGIIFVSTFxyXG4gICAgICAgICAgaWYgKGNsaWVudC51cmwgJiYgXCJmb2N1c1wiIGluIGNsaWVudCkge1xyXG4gICAgICAgICAgICByZXR1cm4gY2xpZW50LmZvY3VzKCk7IC8vINCf0YDQvtGB0YLQviDRhNC+0LrRg9GB0LjRgNGD0LXQvNGB0Y8g0L3QsCDQvdC10LlcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIDIuINCV0YHQu9C4INC+0YLQutGA0YvRgtC+0Lkg0LLQutC70LDQtNC60Lgg0L3QtdGCLCDQvtGC0LrRgNGL0LLQsNC10Lwg0L3QvtCy0YPRjlxyXG4gICAgICAgIGlmIChzZWxmLmNsaWVudHMub3BlbldpbmRvdykge1xyXG4gICAgICAgICAgcmV0dXJuIHNlbGYuY2xpZW50cy5vcGVuV2luZG93KHVybFRvT3Blbik7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KSxcclxuICApO1xyXG59KTtcclxuIl0sIm5hbWVzIjpbInNlbGYiLCJhZGRFdmVudExpc3RlbmVyIiwiZXZlbnQiLCJkYXRhIiwianNvbiIsInRpdGxlIiwiYm9keSIsImljb24iLCJ1cmwiLCJvcHRpb25zIiwiYmFkZ2UiLCJ2aWJyYXRlIiwidGFnIiwicmVub3RpZnkiLCJ3YWl0VW50aWwiLCJyZWdpc3RyYXRpb24iLCJzaG93Tm90aWZpY2F0aW9uIiwiZXJyIiwiY29uc29sZSIsImVycm9yIiwibm90aWZpY2F0aW9uIiwiY2xvc2UiLCJ1cmxUb09wZW4iLCJjbGllbnRzIiwibWF0Y2hBbGwiLCJ0eXBlIiwiaW5jbHVkZVVuY29udHJvbGxlZCIsInRoZW4iLCJjbGllbnRMaXN0IiwiY2xpZW50IiwiZm9jdXMiLCJvcGVuV2luZG93Il0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./worker/index.ts\n"));

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			if (cachedModule.error !== undefined) throw cachedModule.error;
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/trusted types policy */
/******/ 	(() => {
/******/ 		var policy;
/******/ 		__webpack_require__.tt = () => {
/******/ 			// Create Trusted Type policy if Trusted Types are available and the policy doesn't exist yet.
/******/ 			if (policy === undefined) {
/******/ 				policy = {
/******/ 					createScript: (script) => (script)
/******/ 				};
/******/ 				if (typeof trustedTypes !== "undefined" && trustedTypes.createPolicy) {
/******/ 					policy = trustedTypes.createPolicy("nextjs#bundler", policy);
/******/ 				}
/******/ 			}
/******/ 			return policy;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/trusted types script */
/******/ 	(() => {
/******/ 		__webpack_require__.ts = (script) => (__webpack_require__.tt().createScript(script));
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/react refresh */
/******/ 	(() => {
/******/ 		if (__webpack_require__.i) {
/******/ 		__webpack_require__.i.push((options) => {
/******/ 			const originalFactory = options.factory;
/******/ 			options.factory = (moduleObject, moduleExports, webpackRequire) => {
/******/ 				const hasRefresh = typeof self !== "undefined" && !!self.$RefreshInterceptModuleExecution$;
/******/ 				const cleanup = hasRefresh ? self.$RefreshInterceptModuleExecution$(moduleObject.id) : () => {};
/******/ 				try {
/******/ 					originalFactory.call(this, moduleObject, moduleExports, webpackRequire);
/******/ 				} finally {
/******/ 					cleanup();
/******/ 				}
/******/ 			}
/******/ 		})
/******/ 		}
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	
/******/ 	// noop fns to prevent runtime errors during initialization
/******/ 	if (typeof self !== "undefined") {
/******/ 		self.$RefreshReg$ = function () {};
/******/ 		self.$RefreshSig$ = function () {
/******/ 			return function (type) {
/******/ 				return type;
/******/ 			};
/******/ 		};
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval-source-map devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./worker/index.ts");
/******/ 	
/******/ })()
;