<div id="reject-modal" class="remarks-modal">
    <div class="remarks-modal-content">
        <button class="remarks-close-btn" id="reject-close">&times;</button>
        <h3>Remarks For Rejection</h3>
        <div style="position: relative;">
            <!-- Paperclip should be in a wrapper with the textarea -->
            <div style="position: relative;">
                <textarea id="reject-remarks" name="reject-remarks" rows="4"
                    style="width:100%; resize: none; padding-left: 30px;"></textarea>
                <i class="fa fa-paperclip reject-paperclip-icon" style="
            position: absolute;
            left: 10px;
            bottom: 20px;
            font-size: 18px;
            color: #888;
            cursor: pointer;
            pointer-events: auto;
        "></i>
                <input type="file" id="reject-attachments" multiple style="display: none;">
            </div>
            <!-- File list outside the textarea wrapper so it doesn't affect the icon's position -->
            <div id="reject-file-list" class="reject-file-list"></div>

        </div>


        <div style="text-align: right; margin-top: 10px;">
            <button id="reject-submit" class="submit-btn">Submit</button>
        </div>
    </div>
</div>

<!-- Put this right above the closing </body> or anywhere in your modal -->
<style>
    .reject-paperclip-icon {
        transition: background-color 0.3s ease, color 0.3s ease, transform 0.5s ease;
    }

    .reject-paperclip-icon:hover {
        transform: scale(1.5);
        color: #555;
        /* background-color: #eee; */
        /* Uncomment if you want a background on hover */
    }

    .reject-file-list {
        margin-top: 8px;
        padding: 0;
        min-width: 220px;
        max-width: 320px;
        /* Optional, for visual polish */
    }

    .reject-file-item {
        display: flex;
        align-items: center;
        background: #f9f9f9;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        margin-bottom: 6px;
        padding: 6px 12px;
        font-size: 13px;
        position: relative;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
    }

    .reject-file-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .reject-file-remove {
        color: #e53935;
        background: none;
        border: none;
        font-size: 16px;
        cursor: pointer;
        padding: 0 6px;
        margin-left: 8px;
        transition: color 0.2s;
        border-radius: 50%;
    }

    .reject-file-remove:hover {
        color: #b71c1c;
        background: #fce4ec;
    }
</style>