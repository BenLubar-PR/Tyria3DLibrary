/*
Copyright © Tyria3DLibrary project contributors

This file is part of the Tyria 3D Library.

Tyria 3D Library is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Tyria 3D Library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with the Tyria 3D Library. If not, see <http://www.gnu.org/licenses/>.
*/

var Globals = require('./Globals');
var Utils = require('./Utils');

var Viewers = [
    new require("./Viewers/Head")(),
    new require("./Viewers/HexaViewer")(),
    new require("./Viewers/ModelViewer")(),
    new require("./Viewers/PackViewer")(),
    new require("./Viewers/SoundViewer")(),
    new require("./Viewers/StringViewer")(),
    new require("./Viewers/TextureViewer")()
];

var DefaultViewerIndex = 0;

function generateTabLayout() {
    for (let tab of Viewers) {
        let isDefault = tab == Viewers[DefaultViewerIndex];
        let tabHtml = $('#fileTabs').append(
            $(`<div class='fileTab' id='${tab.fileTabId}'>
            <div class='tabOutput' id='${tab.tabOutputId}'></div>
            </div>`)
        )
        if (!isDefault) {
            tabHtml.hide();
        }

        w2ui['fileTabs'].add({
            id: tab.w2tabId,
            caption: tab.caption,
            disabled: !isDefault,
            onClick: function () {
                tab.render();
            }
        });

    }
    w2ui['fileTabs'].select(Viewers[DefaultViewerIndex].w2tabId);
}

function onBasicRendererDone() {
    let fileId = Globals._fileId = T3D.getContextValue(Globals._context, T3D.DataRenderer, "fileId");
    //Not implemented in T3D yet:
    //let fileType = T3D.getContextValue(Globals._context, T3D.DataRenderer, "fileType");

    //Show the filename
    //Todo: implement fileType
    let fileName = `${fileId}`

    //Iterate through the renderers to know who can show and who
    let override;
    for (let viewer of Viewers) {
        //check if can view
        if (viewer.canView()) {
            w2ui.fileTabs.enable(viewer.w2tabId);
        }

        //check if can override
        let overrideAbility = viewer.overrideDefault();
        if (overrideAbility && override === undefined) {
            override = viewer;
        } else if (overrideAbility && override !== undefined) {
            override = null;
        }

    }
    //Set active tab
    if (override) {
        w2ui.fileTabs.click(override.w2tabId);
    } else {
        w2ui.fileTabs.click(Viewers[DefaultViewerIndex].w2tabId);
    }

    //Enable context toolbar and download button
    $("#contextToolbar")
        .append(
            $("<button>Download raw</button>")
            .click(
                function () {
                    var blob = new Blob([rawData], {
                        type: "octet/stream"
                    });
                    Utils.saveData(blob, fileName + ".bin");
                }
            )
        );

}

function viewFileByFileId(fileId) {

    /// Clean outputs
    $(".tabOutput").html("");
    $("#fileTitle").html("");

    /// Clean context toolbar
    $("#contextToolbar").html("");

    /// Disable and clean tabs
    for (let viewer of Viewers) {
        w2ui.fileTabs.disable(viewer.w2tabId);
        viewer.clean();
    }

    /// Make sure _context is clean
    Globals._context = {};

    let rendererSettings = {
        id: fileId
    };

    /// Run the basic DataRenderer
    T3D.runRenderer(
        T3D.DataRenderer,
        Globals._lr,
        rendererSettings,
        Globals._context,
        onBasicRendererDone
    );
}

function viewFileByMFT(mftIdx) {
    let reverseTable = Globals._lr.getReverseIndex();

    var baseId = (reverseTable[mftIdx]) ? reverseTable[mftIdx][0] : "";

    viewFileByFileId(baseId);
}

module.exports = {
    generateTabLayout: generateTabLayout,
    viewFileByFileId: viewFileByFileId,
    viewFileByMFT: viewFileByMFT
}