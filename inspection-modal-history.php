<!-- 1) Modal Markup -->
<div id="historyModal" class="history-modal">
    <div class="modal-history-backdrop"></div>
    <div class="modal-history-container">
        <header class="modal-history-header">
            <h2>Inspection Request History</h2>
            <button class="modal-history-close" aria-label="Close">&times;</button>
        </header>
        <div class="modal-history-body">
            <table class="history-table">
                <thead>
                    <tr>
                        <th>Inspection No.</th>
                        <th>Name</th>
                        <th>Date | Time</th>
                        <th>Activity</th>
                    </tr>
                </thead>
                <tbody id="history-table-request">
                </tbody>
            </table>
        </div>
    </div>
</div>