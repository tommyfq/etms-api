module.exports = (sequelize, Sequelize) => {
    const TicketAttachment = sequelize.define("ticket_attachments", {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        ticket_id:{
            type: Sequelize.INTEGER,
            references: {
                model: 'tickets', // name of the target model
                key: 'id' // key in the target model that the foreign key references
            },
            allowNull: false
        },
        url: {
            type: Sequelize.STRING(4000)
        }
    });

    TicketAttachment.associate = (models) => {
        TicketAttachment.belongsTo(models.Ticket, {
            foreignKey: 'ticket_id',
            as: 'ticket', // alias for the relationship
            onDelete: 'CASCADE', // Optional: Adjust based on your needs
            onUpdate: 'CASCADE' // Optional: Adjust based on your needs
        });
    };
  
    return TicketAttachment;
  };